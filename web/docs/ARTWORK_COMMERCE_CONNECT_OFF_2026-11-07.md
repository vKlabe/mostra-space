# Seller Stripe setup while artwork payments are OFF — 2026-11-07

Base: `1a585b8102174b464b525adf71894ddc1b5bd43c` (PR #21 merged).

## Change

Accepting the platform terms previously left Connect disabled because account setup shared the sales activation gate. Seller connection, OAuth callback and onboarding refresh now use a separate technical-configuration gate. The two commercial/activation approvals remain mandatory for sales, while all technical blockers still apply to account setup.

The seller API exposes `connectionEnabled`; the UI combines it with current consent and busy state, with an explanation in IT/EN/FR/ES. Callback and onboarding refresh recheck consent. Authentication, role, CSRF on POST, seller-bound expiring single-use OAuth state, account ownership, Standard account type and test/live mode checks remain enforced.

No production flag, payment setting, schema, dependency or published terms text changes. Checkout, listing mutations and checkout resumption retain their existing sales gates.

## Validation

- 41 commerce/preflight/consent/connection tests passed.
- Six new tests cover OFF setup and callback, replay/expiry/wrong-seller state, authorization and CSRF, stale consent, technical configuration, account/mode/scope isolation, and continued blocking of checkout/listings/resumption.
- TypeScript and scoped ESLint passed.
- Webpack production build passed in isolation with placeholder credentials and sales approvals OFF.
- New connection test file rerun successfully after replacing fixture IDs with synthetic UUIDs.
- No real Stripe authorization or charge was performed by these tests.

## Production follow-up

After deployment, reload Vendita opere. With technical configuration valid and accepted terms, Collega Stripe must be enabled even though Pagamenti OFF remains visible. The seller completes real Stripe authorization personally. Verify its account status and the still-disabled public payment status before proceeding to the remaining commercial checks and controlled LIVE transaction/refund verification.
