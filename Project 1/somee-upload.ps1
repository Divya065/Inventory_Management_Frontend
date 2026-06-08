# Upload publish-somee to Somee via FTP
# Usage:
#   $env:SOMEE_FTP_PASSWORD = "your-ftp-password"
#   .\somee-upload.ps1
#
# FTP password = Somee Control Panel -> FTP Account (NOT the SQL password)

param(
    [string]$FtpHost = "dp01.somee.com",
    [string]$FtpUser = "dp01",
    [string]$FtpPassword = $env:SOMEE_FTP_PASSWORD,
    [string]$LocalDir = (Join-Path $PSScriptRoot "publish-somee"),
    [string]$RemotePath = "/www.dp01.somee.com"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LocalDir)) {
    Write-Error "publish-somee not found. Run .\somee-publish.ps1 first."
}

if ([string]::IsNullOrWhiteSpace($FtpPassword)) {
    $secure = Read-Host "Enter Somee FTP password (Control Panel -> FTP Account)" -AsSecureString
    $FtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

function Ensure-FtpDirectory {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path) -or $Path -eq "/") { return }
    $parent = Split-Path $Path.TrimEnd("/") -Parent
    if ($parent -and $parent -ne "/") { Ensure-FtpDirectory $parent }
    try {
        $uri = "ftp://${FtpHost}${Path}"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
        $req.UsePassive = $true
        $null = $req.GetResponse()
    } catch { }
}

function Upload-FtpFile {
    param([string]$LocalFile, [string]$RemoteFile)
    $uri = "ftp://${FtpHost}${RemoteFile}"
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
    $req.UseBinary = $true
    $req.UsePassive = $true
    $bytes = [System.IO.File]::ReadAllBytes($LocalFile)
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $null = $req.GetResponse()
    Write-Host "Uploaded: $RemoteFile"
}

function Upload-FtpDirectory {
    param([string]$LocalPath, [string]$RemoteBase)
    Get-ChildItem -LiteralPath $LocalPath -Force | ForEach-Object {
        $remote = "$RemoteBase/$($_.Name)" -replace "//+", "/"
        if ($_.PSIsContainer) {
            Ensure-FtpDirectory $remote
            Upload-FtpDirectory $_.FullName $remote
        } else {
            Ensure-FtpDirectory $RemoteBase
            Upload-FtpFile $_.FullName $remote
        }
    }
}

Write-Host "Uploading $LocalDir to ftp://${FtpHost}${RemotePath} ..."
Ensure-FtpDirectory $RemotePath.TrimEnd("/")
Upload-FtpDirectory $LocalDir $RemotePath.TrimEnd("/")
Write-Host "Done. Test: https://dp01.somee.com/swagger"
