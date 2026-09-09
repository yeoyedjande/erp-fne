import QRCode from "qrcode";
import { cn } from "@/lib/cn";
import { formatFneReference } from "@/lib/format";
import { Icon } from "./ui/Icon";

/**
 * Sticker électronique de certification.
 *
 * La procédure DGI impose une signature électronique en TROIS éléments :
 * le QR Code, le visuel FNE, et le format de la numérotation. Les trois
 * sont réunis ici et nulle part ailleurs — c'est la seule zone du produit
 * autorisée à utiliser le jeton doré.
 */

async function qrSvg(value: string, size: number): Promise<string> {
  return QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    width: size,
    color: { dark: "#1a1815", light: "#ffffff00" },
  });
}

export async function FneSticker({
  reference,
  verificationUrl,
  ncc,
  certifiedAt,
  size = "md",
  className,
}: {
  reference: string;
  verificationUrl: string;
  ncc: string;
  certifiedAt?: Date | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const qrPx = size === "sm" ? 72 : 104;
  const svg = await qrSvg(verificationUrl, qrPx);

  return (
    <figure
      className={cn(
        "flex items-stretch gap-3 rounded-md border border-gold-2/40 bg-gold-soft p-3",
        className,
      )}
    >
      {/* Élément 1 — le QR code */}
      <div
        className="flex items-center justify-center rounded border border-gold-2/30 bg-white p-1.5"
        style={{ width: qrPx + 14, height: qrPx + 14 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <figcaption className="flex min-w-0 flex-col justify-between py-0.5">
        {/* Élément 2 — le visuel FNE */}
        <div>
          <div className="flex items-center gap-1.5 text-gold">
            <Icon name="seal" size={size === "sm" ? 14 : 16} />
            <span className="text-2xs font-bold uppercase tracking-[0.1em]">
              Facture normalisée électronique
            </span>
          </div>
          <p className="mt-0.5 text-2xs uppercase tracking-wider text-gold/80">
            Direction Générale des Impôts · Côte d&apos;Ivoire
          </p>
        </div>

        {/* Élément 3 — le format de la numérotation */}
        <div className="mt-2">
          <p
            className={cn(
              "font-mono font-semibold tabular-nums text-ink",
              size === "sm" ? "text-xs" : "text-sm",
            )}
          >
            {formatFneReference(reference)}
          </p>
          <p className="mt-0.5 font-mono text-2xs tracking-normal text-ink-3">
            NCC {ncc}
            {certifiedAt && (
              <>
                {" · "}
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                }).format(certifiedAt)}
              </>
            )}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

/** Variante compacte pour les listes : visuel + référence, sans QR. */
export function FneChip({ reference }: { reference: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-gold-2/30 bg-gold-soft px-2 py-0.5">
      <Icon name="seal" size={12} className="text-gold" />
      <span className="font-mono text-xs tabular-nums text-gold">{reference}</span>
    </span>
  );
}
