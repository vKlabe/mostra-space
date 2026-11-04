# MOSTRA.SPACE: restore the reviewed schema into the dedicated LOCAL Docker project.
# No remote database connection, CLI db push, reset, payment activation or deployment.
[CmdletBinding()]
param([switch]$ValidateFilesOnly)

$ErrorActionPreference = 'Stop'
$repo = 'G:\Users\User\mostra-space-commerce'
$localRoot = 'G:\Users\User\mostra-space-commerce-local'
$project = 'mostra-space-commerce-local'
$container = 'supabase_db_mostra-space-commerce-local'
$schemaPath = Join-Path $localRoot 'schema-review-ae3e8dd1ab504eb4be2e10d31419337a\public-schema.sql'
$migrationPath = Join-Path $repo 'web\supabase\migrations\20261011143230_fix_commerce_refund_sync.sql'
$expectedSchemaHash = '4BB8DFEF3B02FE35B77A50AE072A79B140781BAC487F82C8C418B9B288C5A56E'
$expectedMigrationHash = 'EE952224CA8E1737FDC74413D62DE587F8174660384B94A3D7AF3B411A9000CD'
$sourceFunctionHash = 'fdf6f98c1393fd70fdb4188025bf8d14'
$fixedFunctionHash = '888929faa7e7bbdf02585f3255e5658a'
$utf8 = [Text.UTF8Encoding]::new($false, $true)

function Read-VerifiedSql([string]$Path, [string]$ExpectedHash) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '') }
    finally { $sha.Dispose() }
    if ($hash -ne $ExpectedHash) { throw "Impronta diversa dal file esaminato: $Path" }
    return $utf8.GetString($bytes).TrimStart([char]0xFEFF)
}

function Write-NewUtf8([string]$Path, [string]$Text) {
    $bytes = $utf8.GetBytes($Text)
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $stream.Write($bytes, 0, $bytes.Length) }
    finally { $stream.Dispose() }
}

$schema = Read-VerifiedSql $schemaPath $expectedSchemaHash
$migration = Read-VerifiedSql $migrationPath $expectedMigrationHash
$configPath = Join-Path $localRoot 'supabase\config.toml'
$config = [IO.File]::ReadAllText($configPath)
if ($config -notmatch '(?m)^\s*project_id\s*=\s*"mostra-space-commerce-local"\s*(?:#.*)?$') {
    throw 'Configurazione di un progetto locale diverso.'
}
if (Test-Path -LiteralPath (Join-Path $localRoot 'supabase\.temp\project-ref')) {
    throw 'La cartella locale risulta collegata a un progetto remoto.'
}
if ($ValidateFilesOnly) {
    Write-Host 'Controllo file superato: schema, correzione e progetto corrispondono a quelli esaminati.'
    Write-Host 'Nessuna connessione al database o modifica eseguita.'
    return
}

$scriptTarget = Join-Path $repo 'web\scripts\Initialize-CommerceLocal.ps1'
$reportTarget = Join-Path $repo 'web\docs\ARTWORK_COMMERCE_LOCAL_2026-10-14.md'
if (Test-Path -LiteralPath $reportTarget) { throw 'Riepilogo locale gia presente: verificare prima di ripetere.' }
if ((Test-Path -LiteralPath $scriptTarget) -and
    ([IO.Path]::GetFullPath($PSCommandPath) -ne [IO.Path]::GetFullPath($scriptTarget))) {
    throw 'Script gia presente nel repository: non viene sovrascritto.'
}
foreach ($directory in @((Split-Path $scriptTarget), (Split-Path $reportTarget))) {
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) { throw "Cartella attesa assente: $directory" }
}
$branch = (& git -C $repo branch --show-current)
if ($LASTEXITCODE -ne 0 -or $branch -ne 'feature/artwork-commerce-payments-off') { throw 'Branch inatteso.' }
$commit = (& git -C $repo rev-parse HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Lettura commit fallita.' }

$docker = (Get-Command docker.exe -ErrorAction Stop).Source
function Invoke-LocalDocker([string[]]$DockerArgs) {
    # Pin the local Windows pipe: environment variables and remote contexts cannot redirect this operation.
    $ErrorActionPreference = 'Continue'
    $result = & $docker --host 'npipe:////./pipe/dockerDesktopLinuxEngine' @DockerArgs 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) {
        $result | ForEach-Object { Write-Host $_.ToString() }
        throw "Comando Docker locale fallito (codice $code). Non ripetere lo script."
    }
    return ($result | ForEach-Object { $_.ToString() })
}

$labels = (Invoke-LocalDocker @('inspect', '--format', '{{json .Config.Labels}}', $container)) -join "`n" | ConvertFrom-Json
if ($labels.'com.supabase.cli.project' -ne $project) { throw 'Etichetta del database locale inattesa.' }
$running = Invoke-LocalDocker @('inspect', '--format', '{{.State.Running}}', $container)
if ($running -ne 'true') { throw 'Database locale non attivo.' }
$containers = @(Invoke-LocalDocker @('ps', '--filter', "label=com.supabase.cli.project=$project", '--format', '{{.Names}}'))
if ($containers -notcontains $container) { throw 'Database non trovato nel progetto locale.' }
foreach ($name in $containers) {
    $ports = (Invoke-LocalDocker @('inspect', '--format', '{{json .NetworkSettings.Ports}}', $name)) -join "`n" | ConvertFrom-Json
    foreach ($property in $ports.PSObject.Properties) {
        foreach ($binding in @($property.Value)) {
            if ($binding -and $binding.HostPort -and $binding.HostIp -notin @('127.0.0.1', '::1')) {
                throw "Porta accessibile dalla rete sul container $name. Nessuna importazione eseguita."
            }
        }
    }
}

$prelude = @'
DO $local_guard$
BEGIN
  PERFORM pg_advisory_xact_lock(173049, 141026);
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'LOCAL_DATABASE_IDENTITY_MISMATCH';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace)
     OR EXISTS (SELECT 1 FROM pg_type WHERE typnamespace='public'::regnamespace)
     OR EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'LOCAL_DATABASE_NOT_EMPTY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'LOCAL_AUTH_TRIGGER_REQUIRES_REVIEW';
  END IF;
  IF to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL THEN
    RAISE EXCEPTION 'LOCAL_PGCRYPTO_DEPENDENCY_MISSING';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace=0
      AND a.grantee<>'postgres'::regrole
      AND (a.grantee<>0 OR d.defaclobjtype NOT IN ('f','T'))
  ) THEN RAISE EXCEPTION 'LOCAL_GLOBAL_DEFAULT_PRIVILEGES_REQUIRE_REVIEW'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
      AND a.grantee NOT IN (0,'postgres'::regrole,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
  ) THEN RAISE EXCEPTION 'LOCAL_SCHEMA_DEFAULT_PRIVILEGES_REQUIRE_REVIEW'; END IF;
END $local_guard$;

-- Remove local inherited ACL additions. The reviewed dump restores object ACLs
-- and production defaults at the end; existing managed schemas are unaffected.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TYPES FROM PUBLIC,anon,authenticated,service_role;
'@

$supplement = @'
-- This verified production trigger belongs to auth and is absent from a public-only dump.
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Only synthetic configuration is inserted. No production users or records are imported.
INSERT INTO public.commerce_settings(id,payments_enabled,revision) VALUES(true,false,0);
REVOKE ALL ON TABLE public.commerce_audit,public.commerce_events,public.commerce_listings,
 public.commerce_oauth_states,public.commerce_orders,public.commerce_refunds,
 public.commerce_sellers,public.commerce_settings FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.commerce_command(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;

DO $verify_baseline$
BEGIN
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='public') <> 65
     OR (SELECT count(*) FROM auth.users) <> 0
     OR (SELECT count(*) FROM public.commerce_orders) <> 0
     OR (SELECT count(*) FROM public.commerce_refunds) <> 0
     OR (SELECT count(*) FROM public.commerce_settings) <> 1
     OR (SELECT payments_enabled FROM public.commerce_settings WHERE id) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'LOCAL_BASELINE_VERIFICATION_FAILED';
  END IF;
  IF (SELECT md5(btrim(replace(prosrc,chr(13)||chr(10),chr(10)),chr(32)||chr(9)||chr(10)||chr(13)))
      FROM pg_proc WHERE oid='public.commerce_command(text,uuid,jsonb)'::regprocedure)
      IS DISTINCT FROM 'fdf6f98c1393fd70fdb4188025bf8d14' THEN
    RAISE EXCEPTION 'LOCAL_BASELINE_FUNCTION_MISMATCH';
  END IF;
  IF (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace
      AND relname LIKE 'commerce\_%' ESCAPE '\' AND relkind='r' AND relrowsecurity) <> 8
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'commerce\_%' ESCAPE '\')
     OR EXISTS (
       SELECT 1 FROM pg_class c CROSS JOIN (VALUES ('anon'),('authenticated')) roles(name)
       WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND c.relname LIKE 'commerce\_%' ESCAPE '\'
         AND has_table_privilege(roles.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     ) OR has_function_privilege('anon','public.commerce_command(text,uuid,jsonb)','EXECUTE')
       OR has_function_privilege('authenticated','public.commerce_command(text,uuid,jsonb)','EXECUTE')
       OR NOT has_function_privilege('service_role','public.commerce_command(text,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'LOCAL_COMMERCE_PRIVILEGES_INVALID';
  END IF;
END $verify_baseline$;
NOTIFY pgrst, 'reload schema';
SELECT 'LOCAL_BASELINE_OK: 65 tables; payments OFF; users/orders/refunds 0; commerce RLS and ACL verified';
'@

$postcheck = @'
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
 'database',current_database(),
 'postgres_version',current_setting('server_version'),
 'public_tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),
 'auth_users',(SELECT count(*) FROM auth.users),
 'payments_enabled',(SELECT payments_enabled FROM public.commerce_settings WHERE id),
 'settings_revision',(SELECT revision FROM public.commerce_settings WHERE id),
 'orders',(SELECT count(*) FROM public.commerce_orders),
 'refunds',(SELECT count(*) FROM public.commerce_refunds),
 'refund_revision_present',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='commerce_orders' AND column_name='refund_revision'),
 'function_md5',(SELECT md5(btrim(replace(prosrc,chr(13)||chr(10),chr(10)),chr(32)||chr(9)||chr(10)||chr(13))) FROM pg_proc WHERE oid='public.commerce_command(text,uuid,jsonb)'::regprocedure),
 'anon_rpc',has_function_privilege('anon','public.commerce_command(text,uuid,jsonb)','EXECUTE'),
 'authenticated_rpc',has_function_privilege('authenticated','public.commerce_command(text,uuid,jsonb)','EXECUTE'),
 'service_role_rpc',has_function_privilege('service_role','public.commerce_command(text,uuid,jsonb)','EXECUTE'),
 'commerce_rls_tables',(SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'commerce\_%' ESCAPE '\' AND relkind='r' AND relrowsecurity),
 'auth_trigger',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='on_auth_user_created' AND tgfoid='public.handle_new_user()'::regprocedure)
);
COMMIT;
'@

$runId = [Guid]::NewGuid().ToString('N')
$staging = Join-Path ([IO.Path]::GetTempPath()) "mostra-local-restore-$runId"
New-Item -ItemType Directory -Path $staging | Out-Null
Write-NewUtf8 (Join-Path $staging 'baseline.sql') ($prelude + "`n" + $schema + "`n" + $supplement)
Write-NewUtf8 (Join-Path $staging 'refund-fix.sql') $migration
Write-NewUtf8 (Join-Path $staging 'verify.sql') $postcheck
$inside = "/tmp/mostra-local-restore-$runId"
Invoke-LocalDocker @('cp', $staging, "${container}:$inside") | Out-Host
$psql = @('exec',$container,'psql','-X','-w','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-P','pager=off','-q','-A','-t')

Write-Host '1/3 Importazione dello schema nel SOLO database locale, in transazione.'
Invoke-LocalDocker ($psql + @('--single-transaction','-f',"$inside/baseline.sql")) | Out-Host
Write-Host '2/3 Baseline locale verificata. Applicazione locale della correzione rimborsi.'
# This original migration has its own BEGIN/COMMIT and repeats the OFF/hash preconditions.
Invoke-LocalDocker ($psql + @('-f',"$inside/refund-fix.sql")) | Out-Host
Write-Host '3/3 Controlli finali in sola lettura.'
$json = (Invoke-LocalDocker ($psql + @('-f',"$inside/verify.sql"))) -join "`n"
$state = $json | ConvertFrom-Json
if ($state.public_tables -ne 65 -or $state.auth_users -ne 0 -or
    $state.payments_enabled -ne $false -or $state.settings_revision -ne 0 -or
    $state.orders -ne 0 -or $state.refunds -ne 0 -or
    $state.refund_revision_present -ne $true -or $state.function_md5 -ne $fixedFunctionHash -or
    $state.anon_rpc -ne $false -or $state.authenticated_rpc -ne $false -or
    $state.service_role_rpc -ne $true -or $state.commerce_rls_tables -ne 8 -or $state.auth_trigger -ne $true) {
    Write-Host $json
    throw 'Controllo finale inatteso: conservare lo stato e inviare questo output. Non ripetere.'
}
# Refresh after the incremental function change too.
Invoke-LocalDocker ($psql + @('-c', "NOTIFY pgrst, 'reload schema';")) | Out-Host
$timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$report = @"
# MOSTRA.SPACE - ambiente commerce locale, 14 ottobre 2026

Verifica eseguita: $timestamp. Branch feature/artwork-commerce-payments-off; HEAD $commit.

## Eseguito sul PC
- Supabase CLI 2.120.0; progetto Docker mostra-space-commerce-local.
- Controllate le porte pubblicate: solo 127.0.0.1 / ::1.
- Schema public esportato senza dati; SHA-256: $expectedSchemaHash.
- Ripristinate 65 tabelle in una transazione, su database locale inizialmente vuoto.
- Normalizzati i privilegi predefiniti locali prima del ripristino degli ACL del dump.
- Ripristinato il trigger auth.users -> public.handle_new_user verificato in produzione.
- Inserita soltanto la configurazione locale Pagamenti OFF, revisione 0.
- Verificate 8 tabelle commerce con RLS e nessuna policy; accesso anon/authenticated negato alle tabelle e alla RPC; RPC service_role consentita.
- Fingerprint commerce_command prima della correzione: $sourceFunctionHash.
- Applicata SOLO LOCALMENTE 20261011143230_fix_commerce_refund_sync.sql, tramite psql.
- SHA-256 del file correttivo: $expectedMigrationHash.
- Fingerprint della funzione corretta: $fixedFunctionHash.
- Verificati refund_revision presente, utenti auth 0, ordini 0, rimborsi 0, Pagamenti OFF.
- Non e stata popolata la cronologia migrazioni della CLI: non usare db push/reset per ripetere questo bootstrap.
- Nessuna connessione dello script al progetto remoto; nessun dato di produzione importato.

## Produzione (lettura diretta del 14 ottobre, precedente a questa esecuzione)
- Pagamenti OFF, revisione 0, ordini 0, rimborsi 0.
- 20261008220511_add_artwork_commerce_payments_off gia applicata: NON rieseguire.
- 20261011143230_fix_commerce_refund_sync NON applicata in produzione.
- La correzione locale non modifica lo stato di produzione.

## Restano da completare
- Collegare il sito locale a questo Supabase, preservando .env.local e i blocchi di attivazione.
- Creare solo utenti/opere di prova e verificare Auth, interfacce IT/EN/FR/ES e comportamento OFF.
- Configurare credenziali del sandbox Stripe Commerce Test e inoltro webhook locale.
- Eseguire test Stripe Connect end-to-end, browser e regressioni abbonamenti.
- Verificare rotazione chiave TEST/Preview e condizioni commerciali; analizzare vulnerabilita npm.
- Salvare script e riepilogo con commit e push sul branch dedicato; aggiornare PR #19.
- Nessun merge, deploy commerce o acquisto reale autorizzato. Pagamenti restano OFF.

## Verifica preventiva dello script
- Sintassi PowerShell e impronte dei file verificate prima della consegna.
- Quattro controlli superati in PGlite temporaneo con pgcrypto: ripristino dello schema/ACL, applicazione della correzione, accessi anon/authenticated negati, rifiuto della ripetizione su database non vuoto.
- Questa prova usa una struttura Auth minima: non costituisce un test di GoTrue, del browser o di Stripe.
- I precedenti 23 test commerce e 7 test PostgreSQL concorrenti non sono stati rieseguiti durante questo bootstrap.

## Risultato JSON locale
    $json
"@
Write-NewUtf8 $reportTarget $report
if (-not (Test-Path -LiteralPath $scriptTarget)) { [IO.File]::Copy($PSCommandPath, $scriptTarget, $false) }
Write-Host $json
Write-Host "Riepilogo salvato: $reportTarget"
Write-Host 'Script e riepilogo sono file locali: nessun commit o push eseguito.'
Write-Host 'IMPORTAZIONE LOCALE COMPLETATA. PAGAMENTI OFF.'
& git -C $repo status --short --branch
if ($LASTEXITCODE -ne 0) { Write-Warning 'Importazione riuscita; leggere separatamente lo stato Git.' }
