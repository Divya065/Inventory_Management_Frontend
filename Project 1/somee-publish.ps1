# Publish ASP.NET Core API for Somee.com FTP upload
# Run from: Project 1\Project 1\
# Output folder: .\publish-somee\

$ErrorActionPreference = "Stop"
$out = Join-Path $PSScriptRoot "publish-somee"

if (Test-Path $out) {
    Remove-Item $out -Recurse -Force
}

Write-Host "Publishing Release build to $out ..."
dotnet publish "$PSScriptRoot\Project 1.csproj" -c Release -o $out

$prod = Join-Path $PSScriptRoot "appsettings.Production.json"
if (Test-Path $prod) {
    Copy-Item $prod (Join-Path $out "appsettings.Production.json") -Force
    Write-Host "Copied appsettings.Production.json"
}

Write-Host ""
Write-Host "Done. Next: .\somee-upload.ps1  (or VS Code: SFTP Upload Project)"
