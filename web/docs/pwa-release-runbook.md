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

## PWA 9 manual checks

- A notification click reaches its intended same-origin page.
- If signed out, the click reaches login and resumes the original destination after password or Google authentication.
- Opening a push marks only that user's notification as read and refreshes the badge.
- Logout removes the current browser subscription but does not disable other active devices.
- Revoking notification permission disables the current endpoint when the app next gains focus or returns online.
- Re-enabling push creates or reactivates one endpoint without duplicate deliveries.
- The installed app continues to load online and the normal browser site remains unchanged.
- Unity galleries, image uploads, PDFs, Stripe, Supabase Realtime and dashboard navigation behave as before.

## Rollback

1. In Vercel, promote the last known-good Production deployment or revert the PWA feature commit through a new pull request.
2. Do not rotate or delete the VAPID key pair during an application rollback; rotating it invalidates existing browser subscriptions.
3. Do not remove the Supabase Cron job, Vault secret, push tables or earlier additive migrations. PWA 8 remains compatible with them.
4. PWA 9 has no database migration. Rolling back its application commit is sufficient.
5. Confirm that `/sw.js` serves the prior worker. Browsers will update it automatically; do not ask users to clear all site data unless a specific device remains stuck.
6. Run the smoke check against Production and verify that the dispatcher still rejects unauthorized requests with HTTP 401.
