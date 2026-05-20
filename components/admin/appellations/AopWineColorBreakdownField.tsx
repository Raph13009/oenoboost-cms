"use client";

import { useMemo } from "react";
import {
  WINE_COLOR_CHART_COLORS,
  WINE_COLOR_LABELS,
  clampWinePct,
  emptyWineColorBreakdown,
  hasWineColorBreakdownData,
  type WineColorBreakdown,
  wineColorBreakdownTotal,
} from "@/lib/aop-wine-color-breakdown";

const inputClass =
  "h-8 w-16 shrink-0 rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400";

type ColorKey = "red" | "white" | "sparkling" | "liqueur";

const COLOR_KEYS: Array<{
  key: ColorKey;
  field: keyof WineColorBreakdown;
}> = [
  { key: "red", field: "wine_pct_red" },
  { key: "white", field: "wine_pct_white" },
  { key: "sparkling", field: "wine_pct_sparkling" },
  { key: "liqueur", field: "wine_pct_liqueur" },
];

function buildConicGradient(pct: WineColorBreakdown): string | null {
  if (!hasWineColorBreakdownData(pct)) return null;
  const segments: Array<{ stop: number; color: string }> = [];
  let cursor = 0;
  const items: Array<{ value: number; color: string }> = [
    { value: pct.wine_pct_red ?? 0, color: WINE_COLOR_CHART_COLORS.red },
    { value: pct.wine_pct_white ?? 0, color: WINE_COLOR_CHART_COLORS.white },
    { value: pct.wine_pct_sparkling ?? 0, color: WINE_COLOR_CHART_COLORS.sparkling },
    { value: pct.wine_pct_liqueur ?? 0, color: WINE_COLOR_CHART_COLORS.liqueur },
  ];
  const parts: string[] = [];
  for (const item of items) {
    if (item.value <= 0) continue;
    const end = cursor + item.value;
    parts.push(`${item.color} ${cursor}% ${end}%`);
    cursor = end;
  }
  if (parts.length === 0) return null;
  return `conic-gradient(${parts.join(", ")})`;
}

function DonutPreview({ pct }: { pct: WineColorBreakdown }) {
  const gradient = buildConicGradient(pct);
  if (!gradient) return null;

  return (
    <div className="flex flex-col items-center gap-2 sm:items-end">
      <div
        className="relative h-20 w-20 rounded-full shadow-inner ring-1 ring-slate-200"
        style={{ background: gradient }}
        aria-hidden
      >
        <div className="absolute inset-[22%] rounded-full bg-white ring-1 ring-slate-100" />
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600">
        {COLOR_KEYS.map(({ key, field }) => {
          const value = pct[field];
          if (value == null || value === 0) return null;
          return (
            <li key={key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full ring-1 ring-slate-200"
                style={{ backgroundColor: WINE_COLOR_CHART_COLORS[key] }}
              />
              <span>
                {WINE_COLOR_LABELS[key]} {value}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AopWineColorBreakdownField({
  value,
  onChange,
  disabled,
}: {
  value: WineColorBreakdown;
  onChange: (next: WineColorBreakdown) => void;
  disabled?: boolean;
}) {
  const noData = !hasWineColorBreakdownData(value);
  const total = wineColorBreakdownTotal(value);

  const totalClass = useMemo(() => {
    if (noData) return "text-slate-500";
    if (total === 100) return "text-emerald-700 font-medium";
    if (total > 0) return "text-amber-700 font-medium";
    return "text-slate-500";
  }, [noData, total]);

  const setNoData = (checked: boolean) => {
    if (checked) onChange(emptyWineColorBreakdown());
    else
      onChange({
        wine_pct_red: 25,
        wine_pct_white: 25,
        wine_pct_sparkling: 25,
        wine_pct_liqueur: 25,
      });
  };

  const setField = (field: keyof WineColorBreakdown, raw: number) => {
    onChange({ ...value, [field]: clampWinePct(raw) });
  };

  const distributeEvenly = () => {
    onChange({
      wine_pct_red: 25,
      wine_pct_white: 25,
      wine_pct_sparkling: 25,
      wine_pct_liqueur: 25,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Pourcentages de production par type de vin. Laissez vide si inconnu — la fiche publique
        n&apos;affichera pas de graphique.
      </p>

      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={noData}
          onChange={(e) => setNoData(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span>Données non renseignées</span>
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          {COLOR_KEYS.map(({ key, field }) => {
            const pctValue = value[field];
            const display = pctValue ?? 0;
            return (
              <div key={key} className="rounded-md border border-slate-100 bg-white/80 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-800">{WINE_COLOR_LABELS[key]}</span>
                  <span className="tabular-nums text-sm font-medium text-slate-700">{display}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={display}
                    disabled={disabled || noData}
                    onChange={(e) => setField(field, Number(e.target.value))}
                    className="h-2 min-w-0 flex-1 cursor-pointer accent-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ accentColor: WINE_COLOR_CHART_COLORS[key] }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={noData ? "" : display}
                    disabled={disabled || noData}
                    onChange={(e) => {
                      const n = e.target.value === "" ? 0 : Number(e.target.value);
                      setField(field, Number.isFinite(n) ? n : 0);
                    }}
                    className={inputClass}
                    aria-label={`${WINE_COLOR_LABELS[key]} en pourcentage`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {!noData && total > 0 && <DonutPreview pct={value} />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
        <p className={`text-sm tabular-nums ${totalClass}`}>Total : {noData ? "—" : `${total} %`}</p>
        <button
          type="button"
          onClick={distributeEvenly}
          disabled={disabled || noData}
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Répartir équitablement
        </button>
      </div>
    </div>
  );
}
