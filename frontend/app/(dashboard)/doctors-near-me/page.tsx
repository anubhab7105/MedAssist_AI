"use client";

export default function DoctorsNearMePage() {
  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-2xl border border-border bg-white p-6 sm:p-8">
      <div className="absolute inset-0 -z-10 bg-aurora" />
      <div className="pointer-events-none flex min-h-[60vh] select-none items-center justify-center rounded-2xl border border-dashed border-border bg-white/60 p-6 backdrop-blur-xl">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-accent">
            Coming soon
          </p>
          <h2 className="mt-3 font-display text-2xl font-medium tracking-tight text-foreground">
            Doctors Near Me
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            This section is currently being prepared and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}

/*
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: places,
    isLoading: placesLoading,
    refetch,
  } = useQuery({
    queryKey: ["nearby-places", latitude, longitude, filter],
    queryFn: () => findNearbyPlaces(latitude!, longitude!, filter === "all" ? undefined : filter),
    enabled: latitude !== null && longitude !== null,
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
              {!placesLoading && places?.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
                  No results found nearby. Try a different filter.
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
*/
