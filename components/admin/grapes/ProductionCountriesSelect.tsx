"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { COUNTRIES_EN } from "@/lib/countries-en";

const labelClass = "block text-[11px] text-slate-500 mb-0.5";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

function normalizeSelected(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = s.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const canonical = COUNTRIES_EN.find((c) => c.toLowerCase() === key) ?? t;
    out.push(canonical);
  }
  return out;
}

export function ProductionCountriesSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  const updateDropdownPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownRect(null);
      return;
    }
    updateDropdownPosition();
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateDropdownPosition]);

  const selectedSet = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES_EN;
    return COUNTRIES_EN.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const addCountry = useCallback(
    (name: string) => {
      const canonical = COUNTRIES_EN.find((c) => c === name) ?? name;
      if (selectedSet.has(canonical.toLowerCase())) return;
      onChange(normalizeSelected([...value, canonical]));
      setQuery("");
    },
    [onChange, selectedSet, value]
  );

  const removeCountry = useCallback(
    (name: string) => {
      onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
    },
    [onChange, value]
  );

  const count = value.length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className={labelClass}>Production countries</label>
        <span className="text-[10px] tabular-nums text-slate-400" aria-live="polite">
          {count === 0 ? "0 selected" : `${count} selected`}
        </span>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((country) => (
            <span
              key={country}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-800"
            >
              <span className="min-w-0 truncate">{country}</span>
              <button
                type="button"
                onClick={() => removeCountry(country)}
                disabled={disabled}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label={`Remove ${country}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="flex h-8 w-full items-center justify-between rounded border border-slate-200 bg-white px-2 text-left text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:opacity-50"
        >
          <span className="truncate text-slate-400">
            {open
              ? "Search in list…"
              : value.length === 0
                ? "Select production countries"
                : "Add countries…"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        </button>
      </div>

      {open &&
        dropdownRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="z-[200] flex max-h-56 flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-lg"
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full shrink-0 border-b border-slate-200 px-2 py-1.5 text-sm focus:outline-none"
              autoFocus
            />
            <ul className="max-h-44 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {filtered.length === 0 ? (
                <li className="px-2 py-2 text-sm text-slate-500">No matches</li>
              ) : (
                filtered.map((country) => {
                  const selected = selectedSet.has(country.toLowerCase());
                  return (
                    <li key={country}>
                      <button
                        type="button"
                        disabled={selected}
                        onClick={() => addCountry(country)}
                        className={`w-full px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:cursor-default disabled:opacity-40 ${
                          selected ? "bg-slate-50" : ""
                        }`}
                      >
                        {country}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
