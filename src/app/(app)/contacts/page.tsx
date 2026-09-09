import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-guard";
import {
  Avatar, Badge, Card, EmptyState, Icon, PageHeader,
  TableShell, Td, Th, Tr,
} from "@/components/ui";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; societe?: string }>;
}) {
  await requireCapability("crm.read");
  const { q = "", societe = "" } = await searchParams;

  const where: Prisma.ContactWhereInput = {
    ...(societe ? { companyId: societe } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { jobTitle: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { name: true, accentToken: true } },
      },
      orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} interlocuteur${contacts.length > 1 ? "s" : ""} chez vos clients et prospects.`}
      />

      <Suspense fallback={<div className="mb-5 h-9" />}>
        <Filters
          searchPlaceholder="Nom, e-mail, fonction, société…"
          selects={[
            {
              name: "societe", label: "Toutes les sociétés",
              options: companies.map((c) => ({ value: c.id, label: c.name })),
            },
          ]}
        />
      </Suspense>

      {contacts.length === 0 ? (
        <Card>
          <EmptyState icon="users" title="Aucun contact ne correspond" />
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Contact</Th>
              <Th>Fonction</Th>
              <Th>Société</Th>
              <Th>Coordonnées</Th>
              <Th>Responsable</Th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={`${c.firstName} ${c.lastName}`} accent="brand" size={30} />
                    <span>
                      <span className="block font-medium text-ink">
                        {c.firstName} {c.lastName}
                      </span>
                      {c.isPrimary && (
                        <Badge tone="brand" className="mt-0.5">Contact principal</Badge>
                      )}
                    </span>
                  </span>
                </Td>
                <Td className="text-sm text-ink-3">{c.jobTitle ?? "—"}</Td>
                <Td>
                  <Link href={`/societes/${c.company.id}`} className="hover:text-brand">
                    {c.company.name}
                  </Link>
                </Td>
                <Td>
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-brand">
                    <Icon name="mail" size={13} className="text-ink-4" />
                    {c.email}
                  </a>
                  {c.phone && (
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono text-xs tabular-nums text-ink-4">
                      <Icon name="phone" size={12} />
                      {c.phone}
                    </span>
                  )}
                </Td>
                <Td className="text-sm text-ink-3">{c.owner?.name ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
