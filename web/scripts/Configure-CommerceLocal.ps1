# Configure only the existing commerce worktree for the dedicated local Supabase.
# Credentials stay in memory / ignored .env files; no schema or user writes.
[CmdletBinding()]
param([switch]$ValidateFilesOnly)
$ErrorActionPreference = 'Stop'
$repo = 'G:\Users\User\mostra-space-commerce'
$web = Join-Path $repo 'web'
$localRoot = 'G:\Users\User\mostra-space-commerce-local'
$envFile = Join-Path $web '.env.local'
$report = Join-Path $web 'docs\ARTWORK_COMMERCE_LOCAL_2026-10-14.md'
$scriptTarget = Join-Path $web 'scripts\Configure-CommerceLocal.ps1'
$marker = '## Collegamento locale del sito e verifica API'
$utf8 = [Text.UTF8Encoding]::new($false, $true)

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) { throw '.env.local atteso non trovato.' }
if (-not (Test-Path -LiteralPath $report -PathType Leaf)) { throw 'Riepilogo del ripristino locale non trovato.' }
if ([IO.File]::ReadAllText($report).Contains($marker)) { throw 'Configurazione gia registrata: non ripetere.' }
if (Test-Path -LiteralPath (Join-Path $localRoot 'supabase\.temp\project-ref')) { throw 'Cartella locale collegata a un progetto remoto.' }
$config = [IO.File]::ReadAllText((Join-Path $localRoot 'supabase\config.toml'))
if ($config -notmatch '(?m)^\s*project_id\s*=\s*"mostra-space-commerce-local"\s*(?:#.*)?$') { throw 'Identificativo del progetto locale inatteso.' }
$original = [IO.File]::ReadAllText($envFile)
foreach ($gate in @('COMMERCE_ACTIVATION_APPROVED','COMMERCE_COMMERCIAL_REVIEWED')) {
    if ([regex]::Matches($original, "(?m)^\s*$gate\s*=\s*false\s*$").Count -ne 1) {
        throw "Il blocco $gate deve essere false. Nessuna modifica."
    }
}
if ($original -notmatch '(?m)^NEXT_PUBLIC_SITE_URL=http://localhost:3000\s*$') { throw 'Origine locale del sito diversa da quella verificata.' }
if ($original -notmatch '(?m)^STRIPE_SECRET_KEY=\s*$') { throw 'Configurazione Stripe cambiata: verificarla prima di questo passaggio.' }
$names = @('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY')
foreach ($name in $names) {
    if ($original -match "(?m)^\s*(?:export\s+)?$name\s*=") { throw "Variabile $name gia presente: non viene sovrascritta." }
    if ([Environment]::GetEnvironmentVariable($name,'Process')) { throw "Variabile $name presente nella sessione: verificarla senza mostrarne il valore." }
}
foreach ($name in @('STRIPE_SECRET_KEY','COMMERCE_ACTIVATION_APPROVED','COMMERCE_COMMERCIAL_REVIEWED','NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_APP_URL')) {
    if ([Environment]::GetEnvironmentVariable($name,'Process')) { throw "Variabile $name presente nella sessione: potrebbe prevalere sul file locale." }
}
foreach ($name in @('.env','.env.development','.env.development.local')) {
    if (Test-Path -LiteralPath (Join-Path $web $name)) { throw "File $name presente: verificarne la precedenza prima di continuare." }
}
if ((Test-Path -LiteralPath $scriptTarget) -and
    ([IO.Path]::GetFullPath($scriptTarget) -ne [IO.Path]::GetFullPath($PSCommandPath))) { throw 'Script di configurazione gia presente nel repository.' }
if ($ValidateFilesOnly) {
    Write-Host 'Precondizioni dei file verificate. Nessun valore di credenziale mostrato; nessuna modifica.'
    return
}
$branch = & git -C $repo branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'feature/artwork-commerce-payments-off') { throw 'Branch inatteso.' }
& git -C $repo check-ignore --quiet -- 'web/.env.local'
if ($LASTEXITCODE -ne 0) { throw '.env.local non risulta escluso da Git.' }
$backupName = '.env.local.before-commerce-supabase-' + [Guid]::NewGuid().ToString('N')
$backup = Join-Path $web $backupName
& git -C $repo check-ignore --quiet -- "web/$backupName"
if ($LASTEXITCODE -ne 0) { throw 'Il percorso del backup non risulta escluso da Git.' }

# Capture output in memory and filter PowerShell stderr records. Never print status output.
$previousDockerHost = [Environment]::GetEnvironmentVariable('DOCKER_HOST','Process')
$previousDockerContext = [Environment]::GetEnvironmentVariable('DOCKER_CONTEXT','Process')
try {
    $env:DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
    [Environment]::SetEnvironmentVariable('DOCKER_CONTEXT',$null,'Process')
    $ErrorActionPreference = 'Continue'
    $help = @(& npx.cmd --yes supabase@2.120.0 status --help 2>&1)
    $helpExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($helpExit -ne 0 -or ($help -join "`n") -notmatch '--workdir' -or ($help -join "`n") -notmatch '--output') {
        throw 'Verifica della CLI fallita. Nessun file modificato.'
    }
    $ErrorActionPreference = 'Continue'
    $raw = @(& npx.cmd --yes supabase@2.120.0 status --workdir $localRoot --output json 2>&1)
    $statusExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($statusExit -ne 0) { throw "Lettura configurazione locale fallita (codice $statusExit). Output nascosto per proteggere le credenziali." }
    $stdout = ($raw | Where-Object { $_ -is [string] }) -join "`n"
    try { $status = $stdout | ConvertFrom-Json -ErrorAction Stop }
    catch { throw 'Risposta JSON della CLI inattesa. Non incollare il contenuto di supabase status.' }
} finally {
    [Environment]::SetEnvironmentVariable('DOCKER_HOST',$previousDockerHost,'Process')
    [Environment]::SetEnvironmentVariable('DOCKER_CONTEXT',$previousDockerContext,'Process')
    $ErrorActionPreference = 'Stop'
}
if ([string]$status.API_URL -notin @('http://127.0.0.1:54321','http://localhost:54321')) { throw 'API URL diversa dal servizio locale atteso.' }
$publicKey = [string]$status.PUBLISHABLE_KEY
if (-not $publicKey) { $publicKey = [string]$status.ANON_KEY }
$anonKey = [string]$status.ANON_KEY
$serviceKey = [string]$status.SERVICE_ROLE_KEY
if (-not $publicKey -or -not $anonKey -or -not $serviceKey) { throw 'Credenziali locali necessarie mancanti.' }
foreach ($key in @($publicKey,$anonKey,$serviceKey)) {
    if ($key -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Formato delle credenziali locali inatteso.' }
}
$api = 'http://127.0.0.1:54321'
$publicHeaders = @{ apikey=$publicKey }
$serviceHeaders = @{ apikey=$serviceKey; Authorization="Bearer $serviceKey" }
function Local-Get([string]$Path, [hashtable]$Headers) {
    if (-not $Path.StartsWith('/')) { throw 'Percorso API locale non valido.' }
    # Read all HTTP status bodies directly. Invoke-WebRequest can consume a 4xx
    # response stream while constructing its ErrorRecord on Windows PowerShell.
    Add-Type -AssemblyName System.Net.Http
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $handler.UseProxy = $false
    $handler.UseCookies = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(20)
    $client.MaxResponseContentBufferSize = 1048576
    $response = $null
    try {
        foreach ($entry in $Headers.GetEnumerator()) {
            if (-not $client.DefaultRequestHeaders.TryAddWithoutValidation([string]$entry.Key,[string]$entry.Value)) {
                throw 'Intestazione HTTP locale non valida.'
            }
        }
        $response = $client.GetAsync($api+$Path).GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        return @{ Code=[int]$response.StatusCode; Body=[string]$body }
    } catch {
        throw "Lettura HTTP locale non completata: $Path. Nessuna credenziale mostrata."
    } finally {
        if ($response) { $response.Dispose() }
        $client.Dispose()
    }
}
$health = Local-Get '/auth/v1/health' $publicHeaders
if ($health.Code -ne 200) { throw "Auth locale non disponibile: HTTP $($health.Code)." }
$profiles = Local-Get '/rest/v1/profiles?select=id&limit=1' $publicHeaders
if ($profiles.Code -ne 200) { throw "Chiave pubblica o API profili da verificare: HTTP $($profiles.Code)." }
$settings = Local-Get '/rest/v1/commerce_settings?select=payments_enabled,revision&id=eq.true' $serviceHeaders
if ($settings.Code -ne 200) { throw "API commerce con service_role non disponibile: HTTP $($settings.Code)." }
$rows = @($settings.Body | ConvertFrom-Json)
if ($rows.Count -ne 1 -or $rows[0].payments_enabled -ne $false -or $rows[0].revision -ne 0) { throw 'Configurazione commerce locale diversa da OFF/revisione 0.' }
$orders = Local-Get '/rest/v1/commerce_orders?select=refund_revision&limit=1' $serviceHeaders
if ($orders.Code -ne 200) { throw 'La correzione rimborsi non risulta disponibile tramite API.' }
$refunds = Local-Get '/rest/v1/commerce_refunds?select=id&limit=1' $serviceHeaders
if ($refunds.Code -ne 200) { throw 'API rimborsi non disponibile.' }
if ($orders.Body.Trim() -notmatch '^\[\s*\]$' -or $refunds.Body.Trim() -notmatch '^\[\s*\]$') { throw 'Sono gia presenti ordini o rimborsi locali: verificare lo stato.' }
$denied = Local-Get '/rest/v1/commerce_settings?select=payments_enabled' $publicHeaders
if ($denied.Code -notin @(401,403)) { throw 'Accesso anonimo commerce non respinto come atteso.' }
if ([string]::IsNullOrWhiteSpace($denied.Body)) {
    throw "Risposta anonima HTTP $($denied.Code) con corpo vuoto: verifica non completata. Nessun file modificato."
}
try { $deniedBody = $denied.Body | ConvertFrom-Json -ErrorAction Stop }
catch { throw 'Risposta del controllo permessi inattesa.' }
if ($deniedBody.code -ne '42501') {
    $safeCode = 'assente o non riconosciuto'
    if ([string]$deniedBody.code -match '^[A-Z0-9_]{1,20}$') { $safeCode = [string]$deniedBody.code }
    throw "Verifica anonima da completare: HTTP $($denied.Code), codice $safeCode, corpo $($denied.Body.Length) caratteri. Nessun file modificato."
}
Write-Host "API locali verificate: Auth 200; profili 200; commerce service_role 200; anonimo $($denied.Code)/42501; Pagamenti OFF."

if ([IO.File]::ReadAllText($envFile) -cne $original) { throw '.env.local e cambiato durante il controllo: nessuna modifica al file.' }
[IO.File]::Copy($envFile,$backup,$false)
$addition = "`r`n# Supabase locale Commerce - credenziali recuperate automaticamente`r`n" +
    "NEXT_PUBLIC_SUPABASE_URL=$api`r`n" +
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$publicKey`r`n" +
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey`r`n" +
    "SUPABASE_SERVICE_ROLE_KEY=$serviceKey`r`n"
[IO.File]::AppendAllText($envFile,$addition,$utf8)
if ([IO.File]::ReadAllText($envFile) -cne ($original+$addition)) {
    throw "Verifica del file aggiornato fallita. Conservare il backup in $backup e non ripetere."
}
$timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$note = @"

$marker
- Esecuzione: $timestamp.
- Configurato .env.local per http://127.0.0.1:54321 con le variabili richieste dal codice esistente.
- Credenziali locali recuperate dalla CLI 2.120.0 senza stamparle; .env.local e backup esclusi da Git.
- Contenuto preesistente del file preservato; COMMERCE_ACTIVATION_APPROVED=false e COMMERCE_COMMERCIAL_REVIEWED=false.
- Verifiche HTTP reali locali: Auth 200, profili con chiave pubblica 200, impostazioni commerce con service_role 200.
- API ordini riconosce refund_revision; ordini e rimborsi ancora vuoti.
- Accesso anonimo alle impostazioni commerce negato: HTTP $($denied.Code), codice SQL 42501.
- La prima esecuzione si era fermata prima di modificare .env.local sul controllo del codice anonimo; la lettura dei corpi HTTP ora usa HttpClient, mantenendo il requisito 42501.
- Pagamenti database OFF, revisione 0. Nessuna scrittura al database in questo passaggio.
- Avvio Next.js, utenti di prova, browser, callback Auth localhost e test Stripe Connect ancora da completare.
- Nessun commit/push automatico; nessun merge o deploy.
"@
[IO.File]::AppendAllText($report,$note+"`r`n",$utf8)
if (-not (Test-Path -LiteralPath $scriptTarget)) { [IO.File]::Copy($PSCommandPath,$scriptTarget,$false) }
Write-Host 'Configurazione locale completata. Chiavi non mostrate. Pagamenti OFF.'
Write-Host "Backup locale: $backup"
Write-Host 'Riepilogo aggiornato; configurazione e backup esclusi da Git.'
& git -C $repo status --short --branch
