import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { VAT_LABELS, VAT_RATES } from "@/lib/fne/constants";
import { formatXOF } from "@/lib/format";
import {
  Amount, Badge, Card, CardHeader, EmptyState, Icon, PageHeader,
  StatCard, TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Catalogue" };
export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string }>;
}) {
  await requireCapability("catalog.read");
  const { q = "", categorie = "" } = await searchParams;

  const products = await prisma.product.findMany({
    where: {
      ...(categorie ? { category: categorie } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { invoiceLines: true, quoteLines: true } } },
  });

  const categories = await prisma.product.findMany({
    distinct: ["category"], select: { category: true }, orderBy: { category: "asc" },
  });

  const recurring = products.filter((p) => p.recurring);
  const mrr = recurring
    .filter((p) => p.unit === "mois")
    .reduce((s, p) => s + p.unitPrice, 0);

  return (
    <>
      <PageHeader
        title="Catalogue d'offres"
        subtitle="Prestations facturables. Le code TVA de chaque offre est transmis tel quel à la plateforme FNE."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Offres actives" value={String(products.filter((p) => p.active).length)} icon="box" tone="brand" />
        <StatCard label="Offres récurrentes" value={String(recurring.length)} icon="refresh" tone="violet" />
        <StatCard label="Familles" value={String(categories.length)} icon="list" tone="teal" />
        <StatCard
          label="Prix mensuel catalogué" value={formatXOF(mrr, { compact: true })}
          hint="somme des offres au mois" icon="trend" tone="success"
        />
      </div>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Référence, désignation…"
          selects={[
            {
              name: "categorie", label: "Toutes les familles",
              options: categories.map((c) => ({ value: c.category, label: c.category })),
            },
          ]}
        />
      </Suspense>

      {products.length === 0 ? (
        <Card>
          <EmptyState icon="box" title="Aucune offre ne correspond" />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Référence</Th>
              <Th>Désignation</Th>
              <Th>Famille</Th>
              <Th align="right">Prix unitaire HT</Th>
              <Th>Régime TVA</Th>
              <Th align="center">Utilisations</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono text-sm tabular-nums text-ink-2">{p.sku}</Td>
                <Td>
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    {p.name}
                    {p.recurring && (
                      <Icon name="refresh" size={12} className="text-violet" aria-label="Offre récurrente" />
                    )}
                  </span>
                  {p.description && (
                    <span className="mt-0.5 block max-w-lg text-sm leading-snug text-ink-3">
                      {p.description}
                    </span>
                  )}
                </Td>
                <Td className="text-sm text-ink-3">{p.category}</Td>
                <Td align="right">
                  <Amount value={p.unitPrice} />
                  <span className="ml-1 text-xs text-ink-4">/ {p.unit}</span>
                </Td>
                <Td>
                  <Badge tone={VAT_RATES[p.vatCode] === 0 ? "neutral" : "brand"}>
                    {p.vatCode} · {VAT_RATES[p.vatCode]} %
                  </Badge>
                  <span className="mt-0.5 block text-xs text-ink-4">{VAT_LABELS[p.vatCode]}</span>
                </Td>
                <Td align="center" className="font-mono text-sm tabular-nums text-ink-3">
                  {p._count.invoiceLines + p._count.quoteLines}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Card className="mt-6">
        <CardHeader title="Rappel des régimes de TVA" icon="info" />
        <dl className="grid gap-3 sm:grid-cols-2">
          {Object.entries(VAT_LABELS).map(([code, label]) => (
            <div key={code} className="flex items-baseline gap-3 border-b border-line pb-2 last:border-0">
              <dt className="w-14 shrink-0 font-mono text-sm font-medium text-ink">{code}</dt>
              <dd className="text-sm text-ink-3">{label}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
