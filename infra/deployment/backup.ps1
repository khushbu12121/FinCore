$ErrorActionPreference = "Stop"

Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$sqlFile = "backups/fincore_$timestamp.sql"
$encryptedFile = "$sqlFile.enc"
$passFile = "backups/.backup_pass.tmp"

$passphrase = Read-Host "Enter encryption passphrase"
Set-Content -Path $passFile -Value $passphrase -NoNewline -Encoding ASCII

Write-Host "Creating database backup..."

cmd /c "docker exec deployment-postgres-1 pg_dump -U $env:POSTGRES_USER $env:POSTGRES_DB > $sqlFile"

if ($LASTEXITCODE -ne 0) {
    Remove-Item $sqlFile -ErrorAction SilentlyContinue
    Remove-Item $passFile -ErrorAction SilentlyContinue
    throw "Backup failed!"
}

Write-Host "Encrypting backup..."

docker run --rm -v "${PWD}/backups:/data" alpine/openssl enc -aes-256-cbc -pbkdf2 -salt -in "/data/$(Split-Path $sqlFile -Leaf)" -out "/data/$(Split-Path $encryptedFile -Leaf)" -pass file:/data/.backup_pass.tmp

if ($LASTEXITCODE -ne 0) {
    throw "Encryption failed!"
}

Remove-Item $sqlFile
Remove-Item $passFile

Write-Host "Encrypted backup created: $encryptedFile"