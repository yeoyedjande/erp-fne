/**
 * Harnais de vérification de la chaîne FNE, exécutable à tout moment :
 *   npm run verify:fne
 *
 * Il joue le calcul fiscal sur l'exemple de la documentation DGI, vérifie les
 * refus du contrôle préalable, certifie réellement une facture puis émet un
 * avoir, et restaure ensuite l'état de démonstration.
 */
import { PrismaClient } from "@prisma/client";
import { certifyInvoice, preflight, certifyCreditNote } from "@/lib/fne/service";
import { computeInvoice } from "@/lib/fne/compute";
import { nextNumber } from "@/lib/invoices";

const prisma = new PrismaClient();
const ok = (label: string, cond: boolean, extra = "") =>
  console.log(`  ${cond ? "✓" : "✖"} ${label}${extra ? " — " + extra : ""}`);

async function main() {
  console.log("\n── 1. Cascade de calcul, exemple de la documentation DGI ──");
  const doc = computeInvoice(
    [
      { description: "sac de riz", quantity: 30, unitPrice: 20000, discount: 10, vatCode: "TVA" },
      { description: "huile", quantity: 20, unitPrice: 12000, discount: 10, vatCode: "TVAC" },
    ],
    10,
  );
  ok("sous-total HT = 756 000", doc.subtotal === 756000, String(doc.subtotal));
  ok("base HT après remise globale = 680 400", doc.baseHT === 680400, String(doc.baseHT));
  ok("TVA 18 % sur la seule ligne taxable = 87 480", doc.vatTotal === 87480, String(doc.vatTotal));

  console.log("\n── 2. Contrôle préalable : B2B sans NCC doit être refusé ──");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
  const inv = await prisma.invoice.findFirstOrThrow({
    where: { fneStatus: "CERTIFIEE" },
    include: { lines: { include: { customTaxes: true } }, customTaxes: true },
  });
  const broken = { ...inv, clientNcc: null, fneStatus: "NON_SOUMISE" as const };
  const check = preflight(broken as never, org);
  ok("refus détecté sans appel réseau", !check.ready, check.blockers[0] ?? "");

  console.log("\n── 3. Certification réelle via la Server Action (service) ──");
  const before = org.fneStickerBalance;
  const draft = await prisma.invoice.findFirst({ where: { status: "BROUILLON" } });
  if (draft) {
    await prisma.invoice.update({ where: { id: draft.id }, data: { status: "EMISE" } });
    const r = await certifyInvoice(draft.id, null);
    ok("certification obtenue", r.ok, r.message);
    const after = await prisma.organization.findUniqueOrThrow({ where: { id: "org" } });
    ok("solde de stickers décrémenté", after.fneStickerBalance === before - 1,
       `${before} → ${after.fneStickerBalance}`);
    const saved = await prisma.invoice.findUniqueOrThrow({
      where: { id: draft.id },
      include: { lines: true },
    });
    ok("référence normalisée enregistrée", /^\d{7}[A-Z]\d{2}\d{9}$/.test(saved.fneReference ?? ""), saved.fneReference ?? "");
    ok("identifiants d'articles DGI stockés (requis pour un avoir)",
       saved.lines.every((l) => Boolean(l.fneItemId)));
    ok("journal alimenté", (await prisma.fneLog.count({ where: { invoiceId: draft.id } })) > 0);

    console.log("\n── 4. Avoir sur cette facture (API #2) ──");
    const note = await prisma.creditNote.create({
      data: {
        number: await nextNumber("A"), invoiceId: draft.id,
        reason: "Test automatisé de bout en bout de la chaîne d'avoir.",
        lines: { create: saved.lines.map((l) => ({ invoiceLineId: l.id, quantity: 1 })) },
      },
    });
    const rc = await certifyCreditNote(note.id, null);
    ok("avoir certifié", rc.ok, rc.message);
    const savedNote = await prisma.creditNote.findUniqueOrThrow({ where: { id: note.id } });
    ok("référence d'avoir préfixée « A »", (savedNote.fneReference ?? "").startsWith("A"), savedNote.fneReference ?? "");
    const inv2 = await prisma.invoice.findUniqueOrThrow({ where: { id: draft.id } });
    ok("facture passée en « avoir émis »", inv2.fneStatus === "AVOIR_EMIS");

    // Remise en état pour que la démonstration reste identique après le test.
    await prisma.creditNote.delete({ where: { id: note.id } });
    await prisma.fneLog.deleteMany({ where: { invoiceId: draft.id } });
    await prisma.invoice.update({
      where: { id: draft.id },
      data: {
        status: "BROUILLON", fneStatus: "NON_SOUMISE", fneReference: null,
        fneToken: null, fneVerificationUrl: null, fneRemoteId: null,
        fneCertifiedAt: null, fneStickerBalance: null,
      },
    });
    await prisma.invoiceLine.updateMany({ where: { invoiceId: draft.id }, data: { fneItemId: null } });
    await prisma.organization.update({ where: { id: "org" }, data: { fneStickerBalance: before } });
    console.log("\n  (état de démonstration restauré)");
  }
}

main().finally(() => prisma.$disconnect());
