"use client";

import { useEffect, useState } from "react";
import {
  getVinificationType,
  type VinificationType,
  type VinificationTypeListItem,
} from "@/app/admin/(cms)/vinification-types/actions";
import { VinificationTypesList } from "./VinificationTypesList";
import { VinificationTypeEditor } from "./VinificationTypeEditor";

type Props = {
  vinificationTypes: VinificationTypeListItem[];
};

export function VinificationTypesView({ vinificationTypes }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [selectedVinificationType, setSelectedVinificationType] =
    useState<VinificationType | null>(null);
  const [isLoadingVinificationType, setIsLoadingVinificationType] = useState(false);

  useEffect(() => {
    let active = true;
    if (selectedId === null || selectedId === "new") {
      setSelectedVinificationType(null);
      setIsLoadingVinificationType(false);
      return () => {
        active = false;
      };
    }
    setIsLoadingVinificationType(true);
    getVinificationType(selectedId)
      .then((vinificationType) => {
        if (!active) return;
        setSelectedVinificationType(vinificationType);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingVinificationType(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 w-[420px] shrink-0 flex-col overflow-hidden">
        <VinificationTypesList
          vinificationTypes={vinificationTypes}
          search={search}
          onSearchChange={setSearch}
          selectedId={selectedId === "new" ? null : selectedId}
          onSelect={setSelectedId}
          onNew={() => setSelectedId("new")}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {selectedId === "new" ? (
          <VinificationTypeEditor
            vinificationType={null}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        ) : selectedId !== null && isLoadingVinificationType ? (
          <div className="flex h-full items-center justify-center border-l border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            Chargement du type de vinification...
          </div>
        ) : selectedId !== null && selectedVinificationType ? (
          <VinificationTypeEditor
            vinificationType={selectedVinificationType}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        ) : selectedId !== null ? (
          <div className="flex h-full items-center justify-center border-l border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            Type de vinification introuvable.
          </div>
        ) : (
          <div className="flex h-full items-center justify-center border-l border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            Sélectionnez un type de vinification ou créez-en un.
          </div>
        )}
      </div>
    </div>
  );
}
