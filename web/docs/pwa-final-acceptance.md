# Mostra.Space PWA final acceptance matrix

Use this matrix after PWA 10 reaches Production. Record only pass/fail and timestamps; never paste VAPID keys, dispatcher secrets, subscription endpoints or browser key material into tickets or screenshots.

| Area | Check | Expected result |
| --- | --- | --- |
| Install | Install from a supported desktop or mobile browser | Standalone app opens on Mostra.Space |
| Consent | Visit Account before accepting notifications | No permission prompt appears without an explicit click |
| Push | Activate notifications and send one controlled notification | One generic push per active device; delivery is `sent` |
| Privacy | Inspect the displayed push and delivery payload contract | No message text, email, profile name or private content |
| Navigation | Click the controlled push while signed in | Same-origin destination opens, notification becomes read, badge updates |
| Authentication | Click a push while signed out | Login opens and resumes only the validated same-origin destination |
| Devices | Log out on one browser | Only that endpoint is deactivated; other devices remain active |
| Permission | Revoke and later restore browser permission | Endpoint reconciles without duplicate subscriptions or deliveries |
| Updates | Reload or reopen the installed app | Worker reports `pwa-10`; no forced reload interrupts a session |
| Network | Use galleries, Unity, uploads, PDFs, Stripe and Realtime | Existing online behavior is unchanged; the worker caches nothing |
| Security | Call dispatcher and admin readiness anonymously | Both endpoints return HTTP 401 |
| Operations | Wait two Cron cycles and open `/admin/pwa` | Readiness is `Pronta`; latest Cron heartbeat is current |
| Rollback | Review the rollback section before sign-off | Last known-good deployment and non-destructive rollback are understood |

Final release acceptance requires every row to pass. A Preview-only Cron warning is expected because the scheduled request continues to target Production; it is not acceptable after the PWA 10 Production deployment has been Ready for more than five minutes.
