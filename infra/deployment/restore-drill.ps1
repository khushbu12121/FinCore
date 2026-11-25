$ErrorActionPreference = "Stop"

Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

$backup = Get-ChildItem backups -Filter "*.sql.enc" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (!$backup) {
    throw "No encrypted backup found!"
}

$passphrase = Read-Host "Enter backup passphrase"
$passFile = "backups/.restore_pass.tmp"
$sqlFile = "backups/restore_test.sql"

Set-Content -Path $passFile -Value $passphrase -NoNewline -Encoding ASCII

Write-Host "Decrypting backup..."

docker run --rm `
  -v "${PWD}/backups:/data" `
  alpine/openssl enc -d -aes-256-cbc -pbkdf2 -in "/data/$($backup.Name)" -out "/data/restore_test.sql" -pass file:/data/.restore_pass.tmp

if ($LASTEXITCODE -ne 0) {
    Remove-Item $passFile -ErrorAction SilentlyContinue
    throw "Decryption failed!"
}

Write-Host "Creating temporary restore database..."

docker compose --env-file .env -f infra/deployment/docker-compose.secure.yml exec -T postgres psql -U $env:POSTGRES_USER -d postgres -c "DROP DATABASE IF EXISTS fincore_restore_test;"
docker compose --env-file .env -f infra/deployment/docker-compose.secure.yml exec -T postgres psql -U $env:POSTGRES_USER -d postgres -c "CREATE DATABASE fincore_restore_test;"

Write-Host "Restoring backup..."

docker cp $sqlFile deployment-postgres-1:/tmp/restore_test.sql
docker exec deployment-postgres-1 psql -U $env:POSTGRES_USER -d fincore_restore_test -f /tmp/restore_test.sql
Remove-Item $passFile
Remove-Item $sqlFile

Write-Host "RESTORE DRILL COMPLETED SUCCESSFULLY!"