"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminPwaControlsProps =
  | { action: "dispatch" }
  | { action: "retry_delivery"; deliveryId: string }
  | { action: "disable_subscription"; subscriptionId: string };

function actionKey(props: AdminPwaControlsProps) {
  if (props.action === "dispatch") return "dispatch";
  if (props.action === "retry_delivery") return `retry:${props.deliveryId}`;
  return `disable:${props.subscriptionId}`;
}

export default function AdminPwaControls(props: AdminPwaControlsProps) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function runAction() {
    if (working) return;

    if (
      props.action === "disable_subscription" &&
      !window.confirm(
        "Disattivare questo endpoint? Non riceverà altri push finché il dispositivo non viene registrato di nuovo."
      )
    ) {
      return;
    }

    setWorking(true);
    setFeedback(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/pwa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.code || "ACTION_FAILED");
      }

      if (props.action === "dispatch") {
        const summary = result.summary || {};
        setFeedback(
          `Completato: ${summary.sent || 0} inviate, ${summary.retried || 0} retry, ${summary.failed || 0} fallite.`
        );
      } else if (props.action === "retry_delivery") {
        setFeedback("Consegna rimessa in coda.");
      } else {
        setFeedback("Endpoint disattivato.");
      }

      router.refresh();
    } catch (error) {
      setIsError(true);
      setFeedback(
        error instanceof Error
          ? `Operazione non riuscita: ${error.message}`
          : "Operazione non riuscita."
      );
    } finally {
      setWorking(false);
    }
  }

  const label =
    props.action === "dispatch"
      ? working
        ? "Esecuzione..."
        : "Esegui dispatcher ora"
      : props.action === "retry_delivery"
        ? working
          ? "Rimetto in coda..."
          : "Riprova"
        : working
          ? "Disattivo..."
          : "Disattiva endpoint";

  return (
    <div data-action={actionKey(props)}>
      <button
        type="button"
        onClick={runAction}
        disabled={working}
        className={
          props.action === "disable_subscription"
            ? "rounded-full border border-red-900 px-4 py-2 text-xs text-red-300 transition hover:border-red-700 disabled:opacity-50"
            : "rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
        }
      >
        {label}
      </button>
      {feedback && (
        <p className={`mt-2 text-xs ${isError ? "text-red-300" : "text-neutral-500"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}
