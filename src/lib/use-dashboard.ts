"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DashboardSnapshot } from "@/domain/types";

async function fetchDashboard(url: string): Promise<DashboardSnapshot> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load your work. Check Supabase auth and migrations.");
  }
  return response.json();
}

export function useDashboard(fallbackData?: DashboardSnapshot | null) {
  const [actionError, setError] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<DashboardSnapshot>(
    "/api/dashboard",
    fetchDashboard,
    {
      fallbackData: fallbackData ?? undefined,
      revalidateOnFocus: false,
      revalidateOnMount: !fallbackData,
    },
  );

  return {
    data: data ?? null,
    loading: Boolean(isLoading && !data),
    error: actionError ?? (error instanceof Error ? error.message : error ? String(error) : null),
    reload: () => {
      setError(null);
      return mutate();
    },
    setError,
  };
}
