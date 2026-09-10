"use client";

/** Filet de sécurité : remplace la mise en page racine si celle-ci échoue. */
export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0, minHeight: "100dvh", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#fbfaf8", color: "#1a1815",
          fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8c857a" }}>
            Erreur serveur
          </p>
          <h1 style={{ fontSize: 28, margin: "0.75rem 0 0", fontWeight: 600 }}>
            L&apos;application n&apos;a pas pu démarrer
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.6, color: "#6b655c" }}>
            Ouvrez <code>/etat</code> pour un diagnostic, ou consultez les
            journaux de déploiement.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem", height: 36, padding: "0 14px", borderRadius: 8,
              border: "1px solid #163a6e", background: "#163a6e", color: "#fff",
              fontSize: 14, cursor: "pointer",
            }}
          >
            Réessayer
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: 12, color: "#8c857a", fontFamily: "ui-monospace, monospace" }}>
              Référence : {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
