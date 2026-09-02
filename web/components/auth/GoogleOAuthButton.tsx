"use client";

import T from "@/components/i18n/T";

type GoogleOAuthButtonProps = {
  mode: "login" | "register";
  disabled?: boolean;
  className?: string;
};

export default function GoogleOAuthButton({
  mode,
  className = "",
}: GoogleOAuthButtonProps) {
  return (
    <div className={className}>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-neutral-800 bg-neutral-900/75 px-6 py-3 text-sm font-medium text-neutral-500 opacity-80"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 font-semibold text-neutral-500">
          G
        </span>

        <span>
          {mode === "register" ? (
            <T
              textKey="auth.oauth.google.registerSoon"
              fallback="Registrati con Google"
            />
          ) : (
            <T textKey="auth.oauth.google.loginSoon" fallback="Accedi con Google" />
          )}
        </span>

        <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.16em] text-neutral-500">
          <T textKey="auth.oauth.google.soonBadge" fallback="Soon" />
        </span>
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-[var(--museum-stone-muted)]">
        <T
          textKey="auth.oauth.google.soonDescription"
          fallback="L’accesso con Google sarà disponibile presto. Per ora usa email e password."
        />
      </p>
    </div>
  );
}
