# Continuous Tunnel Keepalive for EduSuccess AI Backend
Write-Host "EduSuccess AI continuous tunnel keeper initiated..."

while ($true) {
    try {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting localtunnel on port 8000..."
        & npx --yes localtunnel --port 8000 --subdomain edusuccess-api
    } catch {
        Write-Host "localtunnel encountered an interruption. Retrying in 5s..."
    }
    Start-Sleep -Seconds 5
}
