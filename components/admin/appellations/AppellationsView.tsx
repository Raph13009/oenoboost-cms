"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAppellation,
  type Appellation,
  type AppellationListItem,
} from "@/app/admin/(cms)/appellations/actions";
import { DrawerSkeleton, useDelayedBusy } from "@/components/admin/Loaders";
import { AppellationsList } from "./AppellationsList";
import { AppellationEditor } from "./AppellationEditor";
import { useTransition } from "react";

type Props = {
  appellations: AppellationListItem[];
  regions: Array<{ id: string; name_fr: string }>;
  subregions: Array<{ id: string; name_fr: string; region_id: string }>;
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  initialSearch: string;
  initialStatusFilter: string;
  initialRegionFilter: string;
};

export function AppellationsView({
  appellations,
  regions,
  subregions,
  currentPage,
  totalPages,
  hasPrev,
  hasNext,
  initialSearch,
  initialStatusFilter,
  initialRegionFilter,
}: Props) {
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [regionFilter, setRegionFilter] = useState(initialRegionFilter);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [selectedAppellationData, setSelectedAppellationData] = useState<Appellation | null>(null);
  const [isLoadingAppellation, setIsLoadingAppellation] = useState(false);
  const [isNavigatingPage, startPageTransition] = useTransition();
  const router = useRouter();
  const showDrawerLoader = useDelayedBusy(isLoadingAppellation, 150);
  const showListLoader = useDelayedBusy(isNavigatingPage, 150);

  const buildQueryString = (
    nextPage: number,
    nextSearch = search,
    nextStatus = statusFilter,
    nextRegion = regionFilter
  ) => {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextRegion !== "all") params.set("region", nextRegion);
    return params.toString();
  };

  const onPageChange = (nextPage: number) => {
    const queryString = buildQueryString(nextPage);
    startPageTransition(() => {
      router.push(queryString ? `?${queryString}` : "?");
    });
  };

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    setRegionFilter(initialRegionFilter);
  }, [initialRegionFilter]);

  useEffect(() => {
    if (regionFilter === "all") return;
    const exists = regions.some((r) => r.id === regionFilter);
    if (!exists) setRegionFilter("all");
  }, [regionFilter, regions]);

  useEffect(() => {
    const nextSearch = search.trim();
    const currentSearch = initialSearch.trim();
    const sameSearch = nextSearch === currentSearch;
    if (sameSearch) return;
    const t = window.setTimeout(() => {
      const queryString = buildQueryString(1, nextSearch, statusFilter, regionFilter);
      startPageTransition(() => {
        router.push(queryString ? `?${queryString}` : "?");
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [
    search,
    initialSearch,
    statusFilter,
    regionFilter,
    router,
    startPageTransition,
  ]);

  useEffect(() => {
    if (!hasNext) return;
    const queryString = buildQueryString(currentPage + 1);
    router.prefetch(queryString ? `?${queryString}` : "?");
  }, [currentPage, hasNext, router, search, statusFilter, regionFilter]);

  useEffect(() => {
    let active = true;
    if (selectedId === null || selectedId === "new") {
      setSelectedAppellationData(null);
      setIsLoadingAppellation(false);
      return () => {
        active = false;
      };
    }
    setIsLoadingAppellation(true);
    getAppellation(selectedId)
      .then((appellation) => {
        if (!active) return;
        setSelectedAppellationData(appellation);
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingAppellation(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden sm:w-[420px]">
        <AppellationsList
          appellations={appellations}
          regions={regions}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={(nextStatus) => {
            setStatusFilter(nextStatus);
            const queryString = buildQueryString(1, search, nextStatus);
            startPageTransition(() => {
              router.push(queryString ? `?${queryString}` : "?");
            });
          }}
          regionFilter={regionFilter}
          onRegionFilterChange={(nextRegion) => {
            setRegionFilter(nextRegion);
            const queryString = buildQueryString(1, search, statusFilter, nextRegion);
            startPageTransition(() => {
              router.push(queryString ? `?${queryString}` : "?");
            });
          }}
          selectedId={selectedId === "new" ? null : selectedId}
          onSelect={setSelectedId}
          onNew={() => setSelectedId("new")}
          currentPage={currentPage}
          totalPages={totalPages}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPageChange={onPageChange}
          isLoadingList={showListLoader}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {selectedId === "new" ? (
          <AppellationEditor
            appellation={null}
            regions={regions}
            subregions={subregions}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        ) : selectedId !== null && isLoadingAppellation ? (
          showDrawerLoader ? (
            <DrawerSkeleton />
          ) : (
            <div className="h-full border-l border-slate-200 bg-white" />
          )
        ) : selectedId !== null && selectedAppellationData ? (
          <AppellationEditor
            appellation={selectedAppellationData}
            regions={regions}
            subregions={subregions}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        ) : selectedId !== null ? (
          <div className="flex h-full items-center justify-center border-l border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            AOP introuvable.
          </div>
        ) : (
          <div className="flex h-full items-center justify-center border-l border-slate-200 bg-slate-50/50 text-sm text-slate-500">
            Sélectionnez une AOP ou créez-en une.
          </div>
        )}
      </div>
    </div>
  );
}
