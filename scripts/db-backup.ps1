# db-backup.ps1 — Local backup of the Supabase Postgres database.
#
# Usage:   pnpm db:backup        (from the repo root)
# Output:  backups/shasansetu_YYYY-MM-DD_HHmmss.dump  (pg_dump custom format, compressed)
# Restore: & "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -d "<connection-url>" --clean --if-exists backups\<file>.dump
#
# Connection: prefers DATABASE_BACKUP_URL from .env (Supabase *session pooler*,
# port 5432 — IPv4-compatible), falling back to DATABASE_URL. The direct
# db.<ref>.supabase.co host is IPv6-only and unreachable from most home networks,
# so set DATABASE_BACKUP_URL to the pooler URL from Supabase Dashboard → Connect.
#
# Retention: keeps the newest 10 dumps, deletes older ones.

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot '.env'
$backupDir = Join-Path $repoRoot 'backups'

if (-not (Test-Path $envFile)) {
    Write-Error "No .env file found at $envFile"
    exit 1
}

# Read connection URL from .env (DATABASE_BACKUP_URL preferred, DATABASE_URL fallback)
$dbUrl = $null
foreach ($key in @('DATABASE_BACKUP_URL', 'DATABASE_URL')) {
    $line = Get-Content $envFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if ($line) {
        $dbUrl = $line.Substring($key.Length + 1).Trim().Trim('"')
        Write-Host "Using $key from .env"
        break
    }
}
if (-not $dbUrl) {
    Write-Error "Neither DATABASE_BACKUP_URL nor DATABASE_URL found in .env"
    exit 1
}

# Ensure SSL (Supabase requires it)
if ($dbUrl -notmatch 'sslmode=') {
    if ($dbUrl -match '\?') { $dbUrl = "$dbUrl&sslmode=require" }
    else { $dbUrl = "$dbUrl`?sslmode=require" }
}

# Locate pg_dump: installed PostgreSQL first, then PATH
$pgDump = 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe'
if (-not (Test-Path $pgDump)) {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) { $pgDump = $cmd.Source }
    else {
        Write-Error "pg_dump not found. Install PostgreSQL client tools (https://www.postgresql.org/download/windows/) or add pg_dump to PATH."
        exit 1
    }
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$outFile = Join-Path $backupDir "shasansetu_$timestamp.dump"

Write-Host "Backing up to $outFile ..."
& $pgDump --format=custom --no-owner --no-privileges --schema=public --file=$outFile $dbUrl

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    if (Test-Path $outFile) { Remove-Item $outFile -Force }
    exit 1
}

$size = (Get-Item $outFile).Length
$sizeMb = [math]::Round($size / 1MB, 2)
Write-Host "Backup complete: $outFile ($sizeMb MB)"

# Retention: keep the newest 10 dumps
$old = Get-ChildItem $backupDir -Filter 'shasansetu_*.dump' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 10
foreach ($f in $old) {
    Remove-Item $f.FullName -Force
    Write-Host "Deleted old backup: $($f.Name)"
}
