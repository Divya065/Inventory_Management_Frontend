Write-Host "=== Backend Connection Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if port is listening
Write-Host "1. Checking if port 5032 is listening..." -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 5032 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "   ✓ Port 5032 is in use" -ForegroundColor Green
    Write-Host "   State: $($portCheck.State)" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Port 5032 is NOT in use - Backend is not running!" -ForegroundColor Red
}

Write-Host ""

# Test 2: Try to connect to Swagger
Write-Host "2. Testing Swagger endpoint..." -ForegroundColor Yellow
try {
    $swagger = Invoke-WebRequest -Uri "http://localhost:5032/swagger/index.html" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✓ Swagger is accessible (Status: $($swagger.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Cannot reach Swagger: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Try to connect to API
Write-Host "3. Testing API endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        UserName = "test"
        Password = "test"
    } | ConvertTo-Json
    
    $api = Invoke-WebRequest -Uri "http://localhost:5032/api/account" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✓ API is accessible (Status: $($api.StatusCode))" -ForegroundColor Green
} catch {
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ⚠ API responded with status: $statusCode (This is OK - means backend is running)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✗ Cannot reach API: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If backend is not running, start it with: dotnet run" -ForegroundColor Yellow












