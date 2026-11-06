# Artwork commerce: seller terms — 2026-11-05

Base: `17d98a7379e91d1a16680412a78784cecd853948` (PR #20 merged).

## Implemented

- Versioned Italian document at `/legal/vendita-opere-2026-11-05`, discoverable from the legal index, seller panel and purchase dialog.
- Confirmed platform fiscal address and VAT number; 10% on artwork price, excluding shipping.
- Proportional application-fee refunds measured against the original payment total, including shipping; buyer statutory refunds are not reduced by platform/Stripe costs.
- Seller checkbox is initially unchecked. Acceptance works while payments are OFF and does not enable payments.
- Server records authenticated seller ID, timestamp, full document, SHA-256, version, actual supported fee policy and test/live mode in the existing service-only commerce audit table.
- Missing/stale acceptance blocks Stripe connection, enabling listings, new checkout and checkout resumption. Changed fee policy or mode invalidates acceptance.
- Disabling listings, paid order handling and refunds keep their existing authorization and payment-OFF behavior.
- IT/EN/FR/ES interface labels explicitly identify the document as Italian.
- No schema migration, production settings change, new dependency or automatic invoicing claim.

## Validation

In an isolated Vercel Sandbox, with no production credentials:
- TypeScript: passed.
- Commerce/preflight/consent tests: 35 passed, 0 failed.
- Scoped ESLint: passed.
- Next.js webpack production build: passed, using inert build-time Supabase/Stripe placeholders and activation OFF.
- HTTP smoke check: the built versioned legal page returns 200 and includes the fiscal address, 10% fee and document title. The initial 500 was caused by an absent dummy NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the isolated runtime; supplying that runtime value resolved it.
- Existing billing/subscription behavior remains covered by the regression suite.
- The intentional evt_retry error output is an exercised webhook retry, not a failure.

## Activation still pending

This change does not by itself certify tax/legal compliance or activate live payments.

1. Deploy this change; inspect the versioned document and seller acceptance in production.
2. Obtain and verify the first seller's identity, trader/private status, public sales terms, delivery/returns information and fiscal details. The current listing workflow uses the seller's external HTTPS terms URL; it does not independently verify its content or display a structured trader/private badge.
3. Confirm the accountant's operational process for commission invoices and refund adjustments, including applicable e-invoicing, cross-border and reporting duties. Stating that the accountant manages invoicing is not proof of automatic Stripe/SdI integration.
4. Confirm the seller supplies contract confirmation on a durable medium; the application currently stores a seller URL, not an immutable copy of all seller sales terms.
5. After the commercial review is actually complete, use the existing reviewed/approved environment flags and admin switch. Complete a controlled live seller/payment/webhook/refund check and reconcile the ledger.

No production flags have been set to true by this patch. Existing paid orders and refund processing must remain manageable while OFF.

## Primary references checked on 2026-11-05

- MIMIT distance selling: https://www.mimit.gov.it/it/mercato-e-consumatori/tutela-del-consumatore/diritti-del-consumatore/vendita-a-distanza
- MIMIT withdrawal FAQ: https://www.mimit.gov.it/index.php/it/assistenza/domande-frequenti/diritto-di-recesso-domande-frequenti-faq
- Legge 190/2014, art. 1, comma 58: domestic forfettario VAT non-rivalsa (Normattiva / MEF).
- Stripe direct-charge refunds: https://docs.stripe.com/connect/direct-charges
- Stripe fee refund proportionality: https://docs.stripe.com/changelog/2013-12-03/application-fee-refunds-proportional-charged-amount
