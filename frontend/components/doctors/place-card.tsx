"use client";

import { Building2, Cross, Phone, Stethoscope, Pill, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NearbyPlace } from "@/types";

const TYPE_ICON: Record<string, any> = {
  doctor: Stethoscope,
  hospital: Cross,
  clinic: Building2,
  pharmacy: Pill,
};

const TYPE_BADGE: Record<string, "default" | "danger" | "secondary" | "warning"> = {
  doctor: "default",
  hospital: "danger",
  clinic: "secondary",
  pharmacy: "warning",
};

interface PlaceCardProps {
  place: NearbyPlace;
  selected: boolean;
  onSelect: () => void;
  userLat: number;
  userLng: number;
}

export function PlaceCard({ place, selected, onSelect, userLat, userLng }: PlaceCardProps) {
  const Icon = TYPE_ICON[place.type] ?? Building2;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border bg-white p-4 text-left transition-all",
        selected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium text-foreground">{place.name}</p>
            <Badge variant={TYPE_BADGE[place.type]}>{place.type}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{place.distanceKm} km away</p>
          {place.address && <p className="mt-0.5 truncate text-xs text-muted-foreground">{place.address}</p>}

          <div className="mt-2 flex items-center gap-3">
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            )}
            <a
              href={`https://www.openstreetmap.org/directions?from=${userLat}%2C${userLng}&to=${place.latitude}%2C${place.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Navigation className="h-3 w-3" /> Directions
            </a>
          </div>
        </div>
      </div>
    </button>
  );
}
