"use client";

import { useEffect } from "react";
import T from "@/components/i18n/T";

type GlobalErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <html lang="it">
      <body>
        <main
          style={{
            minHeight: "100vh",
            background: "#0a0a0a",
            color: "#fafafa",
            padding: "48px 24px",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <section
            style={{
              maxWidth: "900px",
              minHeight: "70vh",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                marginBottom: "16px",
                color: "#f87171",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.28em",
              }}
            >
              <T
                textKey="globalError.header.label"
                fallback="Errore critico"
              />
            </p>

            <h1
              style={{
                fontSize: "48px",
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 600,
              }}
            >
              <T
                textKey="globalError.header.title"
                fallback="MOSTRA.SPACE non è riuscito a caricare correttamente."
              />
            </h1>

            <p
              style={{
                marginTop: "24px",
                maxWidth: "680px",
                color: "#a3a3a3",
                fontSize: "15px",
                lineHeight: 1.8,
              }}
            >
              <T
                textKey="globalError.header.description"
                fallback="Si è verificato un errore generale. Puoi riprovare a caricare la pagina oppure tornare alla home."
              />
            </p>

            {error.digest && (
              <p
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  border: "1px solid #262626",
                  borderRadius: "16px",
                  background: "#171717",
                  color: "#737373",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                <T
                  textKey="globalError.details.codeLabel"
                  fallback="Codice errore:"
                />{" "}
                {error.digest}
              </p>
            )}

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  border: 0,
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#0a0a0a",
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <T textKey="globalError.actions.retry" fallback="Riprova" />
              </button>

              <a
                href="/"
                style={{
                  border: "1px solid #404040",
                  borderRadius: "999px",
                  color: "#fafafa",
                  padding: "10px 20px",
                  textDecoration: "none",
                }}
              >
                <T
                  textKey="globalError.actions.home"
                  fallback="Torna alla home"
                />
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}