"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceCard } from "@/components/doctors/place-card";
import { useGeolocation } from "@/hooks/useGeolocation";
import { findNearbyPlaces } from "@/services/doctors";
import type { PlaceType } from "@/types";

const DoctorsMap = dynamic(() => import("@/components/doctors/map").then((m) => m.DoctorsMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted-foreground">Loading map...</div>,
});

const FILTERS: { label: string; value: PlaceType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Doctors", value: "doctor" },
  { label: "Hospitals", value: "hospital" },
  { label: "Clinics", value: "clinic" },
  { label: "Pharmacies", value: "pharmacy" },
];

export default function DoctorsNearMePage() {
  const { latitude, longitude, loading, error, requestLocation } = useGeolocation();
  const [filter, setFilter] = useState<PlaceType | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: places,
    isLoading: placesLoading,
    isError: placesError,
    refetch,
  } = useQuery({
    queryKey: ["nearby-places", latitude, longitude, filter, debouncedSearch],
    queryFn: () =>
      findNearbyPlaces(
        latitude!,
        longitude!,
        filter === "all" ? undefined : filter,
        20000,
        debouncedSearch || undefined
      ),
    enabled: latitude !== null && longitude !== null,
    retry: 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Doctors Near Me</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find nearby doctors, hospitals, clinics, and pharmacies.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={placesLoading}>
          <RefreshCw className={`h-4 w-4 ${placesLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Getting your location...
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-6 text-center">
          <MapPin className="h-6 w-6 text-warning" />
          <p className="text-sm text-warning">{error}</p>
          <Button size="sm" onClick={requestLocation}>Try again</Button>
        </div>
      )}

      {latitude !== null && longitude !== null && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors, dentists, hospitals, clinics, pharmacies..."
              className="h-11 pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as PlaceType | "all")}>
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
              {placesLoading && (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              )}
              {!placesLoading && placesError && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-8 text-center">
                  <MapPin className="h-6 w-6 text-warning" />
                  <p className="text-sm text-warning">
                    Couldn't load nearby places right now. The map data provider may be busy — please try again.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              )}
              {!placesLoading && !placesError && places?.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
                  No results found nearby. Try a different filter or search.
                </div>
              )}
              {places?.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  selected={selectedId === place.id}
                  onSelect={() => setSelectedId(place.id)}
                  userLat={latitude}
                  userLng={longitude}
                />
              ))}
            </div>

            <div className="h-[600px] overflow-hidden rounded-2xl border border-white/[0.06]">
              <DoctorsMap
                userLat={latitude}
                userLng={longitude}
                places={places ?? []}
                selectedId={selectedId}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
