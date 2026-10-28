import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const webRoot = new URL("../../", import.meta.url);

function loadTs(path, stubs = {}) {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(path, webRoot), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: path,
    }
  );
  const module = { exports: {} };
  const resolve = (name) =>
    Object.hasOwn(stubs, name) ? stubs[name] : require(name);
  new Function("require", "module", "exports", outputText)(
    resolve, module, module.exports
  );
  return module.exports;
}

const cancellationModule = loadTs("lib/billing/subscription-cancellation.ts");
const { getSubscriptionCancellation } = cancellationModule;
const periodEnd = "2026-11-18T19:26:53Z";
const active = {
  status: "active",
  cancelAt: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: periodEnd,
};

test("an active renewing subscription has no scheduled cancellation", () => {
  assert.deepEqual(getSubscriptionCancellation(active), {
    scheduled: false, date: null,
  });
});

test("flexible portal cancellation works with the period-end flag false", () => {
  assert.deepEqual(getSubscriptionCancellation({ ...active, cancelAt: periodEnd }), {
    scheduled: true, date: periodEnd,
  });
});

test("classic cancellation uses the period end when cancel_at is absent", () => {
  assert.deepEqual(getSubscriptionCancellation({ ...active, cancelAtPeriodEnd: true }), {
    scheduled: true, date: periodEnd,
  });
});

test("an explicit cancellation date takes precedence over the current period", () => {
  const cancelAt = "2026-12-18T19:26:53Z";
  assert.equal(getSubscriptionCancellation({ ...active, cancelAt }).date, cancelAt);
});

test("revoking cancellation restores the renewing state", () => {
  const scheduled = { ...active, cancelAt: periodEnd };
  assert.equal(getSubscriptionCancellation(scheduled).scheduled, true);
  assert.deepEqual(getSubscriptionCancellation({
    ...scheduled, cancelAt: null, cancelAtPeriodEnd: false,
  }), { scheduled: false, date: null });
});

test("ended subscriptions do not count as pending cancellations", () => {
  for (const status of ["canceled", "incomplete_expired"]) {
    assert.deepEqual(getSubscriptionCancellation({
      ...active, status, cancelAt: periodEnd, cancelAtPeriodEnd: true,
    }), { scheduled: false, date: null });
  }
});

test("profiles without Stripe billing data have no cancellation", () => {
  assert.deepEqual(getSubscriptionCancellation({}), {
    scheduled: false, date: null,
  });
});

const { default: PlanUsageCard } = loadTs("components/dashboard/PlanUsageCard.tsx", {
  "@/components/i18n/T": ({ fallback }) => fallback,
  "@/components/billing/CustomerPortalButton": () => null,
  "@/components/time/LocalDateTime": ({ value }) => value,
  "@/lib/plans": loadTs("lib/plans.ts"),
  "@/lib/billing/subscription-cancellation": cancellationModule,
});
const cardProps = {
  plan: "pro", galleriesCount: 0, artworksCount: 2,
  storageUsedBytes: 0, monthlyRequestsCount: 0,
  stripeSubscriptionStatus: "active", stripeCurrentPeriodEnd: periodEnd,
  stripeCancelAtPeriodEnd: false,
};

test("dashboard shows active-until and cancellation for the flexible payload", () => {
  const html = renderToStaticMarkup(createElement(PlanUsageCard, {
    ...cardProps, stripeCancelAt: periodEnd,
  }));
  assert.match(html, /Attivo fino al/);
  assert.match(html, /Cancellazione programmata/);
  assert.ok(html.includes(periodEnd));
  assert.doesNotMatch(html, /Rinnovo previsto il|non risulta attivo/);
});

test("dashboard returns to renewal wording when cancellation is revoked", () => {
  const html = renderToStaticMarkup(createElement(PlanUsageCard, {
    ...cardProps, stripeCancelAt: null,
  }));
  assert.match(html, /Rinnovo previsto il/);
  assert.doesNotMatch(html, /Cancellazione programmata|Attivo fino al/);
});
