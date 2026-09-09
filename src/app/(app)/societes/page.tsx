import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import { COMPANY_STATUS } from "@/lib/business";
import { TEMPLATE_LABELS } from "@/lib/fne/constants";
import { formatXOF } from "@/lib/format";
import {
  Amount, Avatar, Badge, Card, EmptyState, PageHeader, StatCard,
  TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";
import { totalsOf } from "@/lib/invoices";

export const metadata = { title: "Sociétés" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; secteur?: string }>;
}) {
  await requireCapability("crm.read");
  const { q = "", statut = "", secteur = "" } = await searchParams;

  const where: Prisma.CompanyWhereInput = {
    ...(statut ? { status: statut as never } : {}),
    ...(secteur ? { industry: secteur } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { legalName: { contains: q, mode: "insensitive" } },
            { ncc: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [companies, industries, invoices] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        owner: { select: { name: true, accentToken: true } },
        _count: { select: { contacts: true, opportunities: true, tickets: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.company.findMany({ distinct: ["industry"], select: { industry: true }, orderBy: { industry: "asc" } }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: {
        companyId: true, discount: true,
        lines: { include: { customTaxes: true } },
        customTaxes: true,
      },
    }),
  ]);

  /* Chiffre d'affaires facturé par société. */
  const revenue = new Map<string, number>();
  for (const inv of invoices) {
    revenue.set(inv.companyId, (revenue.get(inv.companyId) ?? 0) + totalsOf(inv as never).total);
  }

  const counts = companies.reduce(
    (a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <>
      <PageHeader
        title="Sociétés"
        subtitle="Clients, prospects et partenaires de Markel Technology."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients actifs" value={String(counts.CLIENT ?? 0)} icon="building" tone="success" />
        <StatCard label="Prospects" value={String(counts.PROSPECT ?? 0)} icon="target" tone="warning" />
        <StatCard label="Partenaires" value={String(counts.PARTENAIRE ?? 0)} icon="users" tone="violet" />
        <StatCard
          label="CA facturé cumulé"
          value={formatXOF([...revenue.values()].reduce((s, v) => s + v, 0), { compact: true })}
          icon="invoice" tone="brand"
        />
      </div>

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Raison sociale, NCC, ville…"
          selects={[
            {
              name: "statut", label: "Tous les statuts",
              options: Object.entries(COMPANY_STATUS).map(([value, m]) => ({ value, label: m.label })),
            },
            {
              name: "secteur", label: "Tous les secteurs",
              options: industries.map((i) => ({ value: i.industry, label: i.industry })),
            },
          ]}
        />
      </Suspense>

      {companies.length === 0 ? (
        <Card>
          <EmptyState
            icon="building"
            title="Aucune société ne correspond"
            description="Modifiez vos critères de recherche pour élargir les résultats."
          />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Société</Th>
              <Th>Secteur</Th>
              <Th>NCC / Régime</Th>
              <Th>Statut</Th>
              <Th align="right">CA facturé</Th>
              <Th align="center">Contacts</Th>
              <Th>Responsable</Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <Tr key={c.id} href={`/societes/${c.id}`}>
                <Td>
                  <Link href={`/societes/${c.id}`} className="font-medium text-ink hover:text-brand">
                    {c.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ink-4">{c.city}, {c.country}</span>
                </Td>
                <Td className="text-sm text-ink-3">{c.industry}</Td>
                <Td>
                  <span className="block font-mono text-sm tabular-nums text-ink-2">
                    {c.ncc ?? "—"}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-4">
                    {TEMPLATE_LABELS[c.fneTemplate].split("—")[0].trim()}
                  </span>
                </Td>
                <Td><Badge tone={COMPANY_STATUS[c.status].tone} dot>{COMPANY_STATUS[c.status].label}</Badge></Td>
                <Td align="right"><Amount value={revenue.get(c.id) ?? 0} compact /></Td>
                <Td align="center" className="font-mono text-sm tabular-nums text-ink-3">
                  {c._count.contacts}
                </Td>
                <Td>
                  {c.owner ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={c.owner.name} accent={c.owner.accentToken} size={24} />
                      <span className="text-sm text-ink-2">{c.owner.name}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-ink-4">Non attribué</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
