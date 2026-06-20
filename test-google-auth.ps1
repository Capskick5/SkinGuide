$body = '{"credential":"mock-google-token-testuser@gmail.com"}'
try {
    $response = Invoke-RestMethod -Method POST `
        -Uri 'http://localhost:8080/api/auth/google' `
        -ContentType 'application/json' `
        -Body $body `
        -TimeoutSec 10
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Error: $($_.Exception.Message)"
}
