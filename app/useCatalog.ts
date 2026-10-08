"use client";

import { useEffect, useState } from "react";

/** One table a dataset publishes, from public/catalog/<dataset>.json (aws/api/catalog.py). */
export type CatalogTable = {
  path: string;
  schema: string;
  table: string;
  rows: number;
  columns: [name: string, type: string][];
  filters: string[];
  sample: Record<string, unknown>;
};

const cache = new Map<string, Promise<CatalogTable[]>>();

/** A dataset's tables, fetched once per page load when its API box first opens. */
export function useCatalog(dataset: string | undefined) {
  const [tables, setTables] = useState<CatalogTable[] | null>(null);
  useEffect(() => {
    if (!dataset) return;
    if (!cache.has(dataset)) cache.set(dataset, fetch(`/catalog/${dataset}.json`).then((r) => r.json()).then((c) => c.tables));
    let live = true;
    void cache.get(dataset)!.then((t) => live && setTables(t));
    return () => {
      live = false;
    };
  }, [dataset]);
  return tables;
}
