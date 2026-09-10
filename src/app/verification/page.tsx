import { redirect } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vérifier une facture" };

async function verify(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "").trim();
  if (!raw) redirect("/verification");
  // On accepte le code seul ou l'URL complète imprimée sur la facture.
  const token = raw.includes("/") ? raw.split("/").filter(Boolean).pop()! : raw;
  redirect(`/verification/${encodeURIComponent(token)}`);
}

export default function VerificationIndex() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-content px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-2/30 bg-gold-soft px-3 py-1 text-xs font-medium text-gold">
            <Icon name="seal" size={13} />
            Vérification d&apos;authenticité
          </span>

          <h1 className="mt-5 font-display text-3xl font-semibold text-ink">
            Vérifier une facture normalisée
          </h1>
          <p className="mt-3 text-md leading-relaxed text-ink-2">
            Toute facture certifiée émise par Markel Technology porte un sticker
            électronique. Scannez son QR code, ou saisissez ci-dessous le code de
            vérification qui l&apos;accompagne.
          </p>

          <form action={verify} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              name="code"
              required
              placeholder="019465c1-3f61-766c-9652-706e32dfb436"
              aria-label="Code de vérification"
              className="field h-11 flex-1 font-mono text-sm"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-brand bg-brand px-5 text-md font-medium text-white transition-colors hover:bg-brand-2"
            >
              Vérifier
              <Icon name="arrowRight" size={17} />
            </button>
          </form>

          <p className="mt-4 text-sm leading-relaxed text-ink-3">
            Le code de vérification figure sous le QR code, au bas de la facture. Il est
            délivré par la plateforme FNE de la Direction Générale des Impôts et ne peut
            pas être reconstitué par l&apos;émetteur.
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
