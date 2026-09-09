"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatXOF } from "@/lib/format";

/**
 * Les couleurs viennent des jetons du design, lues au moment du rendu
 * (les composants Recharts n'acceptent pas les classes utilitaires).
 */
const token = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || fallback;
};

const C = {
  brand: () => token("brand", "#163a6e"),
  brand3: () => token("brand-3", "#2b5ca8"),
  brand4: () => token("brand-4", "#7fa3d6"),
  teal: () => token("teal", "#0f6b70"),
  violet: () => token("violet", "#5b3e9e"),
  gold: () => token("gold-2", "#b8860b"),
  success: () => token("success", "#15734e"),
  warning: () => token("warning", "#9a6212"),
  danger: () => token("danger", "#a32b23"),
  line: () => token("line", "#e8e4dd"),
  ink3: () => token("ink-3", "#6b655c"),
  surface: () => token("surface", "#ffffff"),
};

export const SERIES_COLORS = [C.brand, C.teal, C.violet, C.brand4, C.warning, C.success];

const axisProps = {
  stroke: "transparent",
  tick: { fontSize: 11, fill: C.ink3() },
  tickLine: false,
  axisLine: false,
} as const;

function TooltipBox({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-2">
      <p className="mb-1 text-xs font-semibold text-ink">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span>{p.name}</span>
          <span className="ml-auto font-mono tabular-nums text-ink">
            {money ? formatXOF(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function RevenueAreaChart({
  data, money = true,
}: { data: Array<Record<string, number | string>>; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 22, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradFacture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.brand()} stopOpacity={0.16} />
            <stop offset="100%" stopColor={C.brand()} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradEncaisse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.success()} stopOpacity={0.14} />
            <stop offset="100%" stopColor={C.success()} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line()} vertical={false} />
        <XAxis dataKey="mois" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => formatXOF(Number(v), { compact: true, symbol: false })} width={52} />
        <Tooltip content={<TooltipBox money={money} />} cursor={{ stroke: C.line() }} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area type="monotone" dataKey="facture" name="Facturé" stroke={C.brand()} strokeWidth={2} fill="url(#gradFacture)" />
        <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke={C.success()} strokeWidth={2} fill="url(#gradEncaisse)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StageBarChart({
  data,
}: { data: Array<{ etape: string; montant: number; nombre: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={236}>
      <BarChart data={data} margin={{ top: 22, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.line()} vertical={false} />
        <XAxis dataKey="etape" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => formatXOF(Number(v), { compact: true, symbol: false })} width={52} />
        <Tooltip content={<TooltipBox money />} cursor={{ fill: C.line(), fillOpacity: 0.4 }} />
        <Bar dataKey="montant" name="Montant pondéré" radius={[4, 4, 0, 0]} maxBarSize={46}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]()} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data, money = true,
}: { data: Array<{ nom: string; valeur: number }>; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={224}>
      <PieChart>
        <Pie
          data={data} dataKey="valeur" nameKey="nom"
          innerRadius={54} outerRadius={82} paddingAngle={2} strokeWidth={2}
          stroke={C.surface()}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]()} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox money={money} />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ActivityLineChart({
  data,
}: { data: Array<{ jour: string; tickets: number; resolus: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 22, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.line()} vertical={false} />
        <XAxis dataKey="jour" {...axisProps} />
        <YAxis {...axisProps} width={30} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: C.line() }} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="tickets" name="Ouverts" stroke={C.warning()} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="resolus" name="Résolus" stroke={C.teal()} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
