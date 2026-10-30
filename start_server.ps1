# Launch Local Physics Laboratory Server
Write-Host "Starting Interactive Water Wave Simulation Laboratory on http://localhost:8080..." -ForegroundColor Cyan
Start-Process "http://localhost:8080"
python -m http.server 8080 --directory "$PSScriptRoot"
