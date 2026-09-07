# Mostra.Space PWA release runbook

## Invariants

- Notification permission is requested only after an explicit user action.
- `public/sw.js` has no `fetch` listener and never caches private pages, API responses, Unity assets, uploads, PDFs or payment flows.
- Push payloads contain generic localized copy, a same-origin path, a notification UUID and an unread count. They never contain chat text or other private content.
- VAPID private keys and the dispatcher secret remain server-only.
- A logout deactivates only the current browser endpoint. Other devices remain independent.

## Release order

1. Apply additive Supabase migrations, when a phase includes one.
2. Run `npm run i18n:check`, `npm run pwa:check`, ESLint and the production build.
3. Test locally with `npm run start` and `npm run pwa:check -- http://localhost:3000`.
4. Create a feature branch and wait for the protected Vercel Preview to become Ready.
5. Verify account PWA settings, admin monitoring and the notification gateway in the Preview browser session.
6. Merge only with green checks.
7. Wait for Production Ready, then run `npm run pwa:check -- https://mostra.space`.
8. Perform one controlled push and verify its delivery row, deep link, read state and badge.

## PWA 10 release certification

1. Apply `20260907_add_pwa_release_observability.sql` before deploying the application code.
2. Run `npm run pwa:release`; the static contract and production build must both pass.
3. Run the live smoke check against localhost and Production. A local dispatcher without its optional local secret may return 503; Production must return 401 without authorization. Vercel Authentication can return 302 for an unauthenticated Preview CLI request, so verify the protected Preview in a signed-in browser.
4. Open `/admin/pwa` and refresh the readiness diagnosis. Preview may show only the Cron heartbeat warning because the existing Cron targets Production.
5. Merge only when Vercel is Ready, the GitHub checks are green and no readiness check is marked `Bloccante`.
6. After Production is Ready, wait two minutes and refresh `/admin/pwa`. The release should be `Pronta`; investigate any remaining warning instead of clearing data or rotating keys.
7. Run the read-only PWA 10 SQL verification and confirm that the dispatcher heartbeat is current.
8. Complete the controlled push test from the final acceptance matrix.

The readiness endpoint is admin-only, returns no secret values and never dispatches a notification. Every automatic or manual dispatcher cycle records a bounded heartbeat. Completed heartbeat rows older than 30 days are pruned automatically; push delivery history remains independent.

## PWA 9 manual checks

- A notification click reaches its intended same-origin page.
- If signed out, the click reaches login and resumes the original destination after password or Google authentication.
- Opening a push marks only that user's notification as read and refreshes the badge.
- Logout removes the current browser subscription but does not disable other active devices.
- Revoking notification permission disables the current endpoint when the app next gains focus or returns online.
- Re-enabling push creates or reactivates one endpoint without duplicate deliveries.
- The installed app continues to load online and the normal browser site remains unchanged.
- Unity galleries, image uploads, PDFs, Stripe, Supabase Realtime and dashboard navigation behave as before.

## PWA 10 final sign-off

- `/api/admin/pwa/health` returns HTTP 401 without a session and a readiness report only to an administrator.
- A healthy Production Cron produces a successful `cron` heartbeat at least every five minutes, including cycles with zero queued notifications.
- A manual dispatcher run produces a separate `admin` heartbeat and remains recorded in the existing administrative audit trail.
- No active expired endpoint, stale processing delivery or overdue pending delivery remains after two automatic cycles.
- The Service Worker reports `pwa-10`, still has no fetch handler and does not cache application data.
- The install, permission, device isolation, deep-link, read-state and badge checks from PWA 9 still pass.

## Rollback

1. In Vercel, promote the last known-good Production deployment or revert the PWA feature commit through a new pull request.
2. Do not rotate or delete the VAPID key pair during an application rollback; rotating it invalidates existing browser subscriptions.
3. Do not remove the Supabase Cron job, Vault secret, push tables or earlier additive migrations. PWA 8 remains compatible with them.
4. PWA 9 has no database migration. The additive PWA 10 heartbeat table can remain in place during an application rollback and is ignored by older code.
5. Confirm that `/sw.js` serves the prior worker. Browsers will update it automatically; do not ask users to clear all site data unless a specific device remains stuck.
6. Run the smoke check against Production and verify that the dispatcher still rejects unauthorized requests with HTTP 401.
