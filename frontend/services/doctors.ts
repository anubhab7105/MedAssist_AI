import { api } from "@/lib/api";
import type { NearbyPlace, PlaceType } from "@/types";

export async function findNearbyPlaces(
  latitude: number,
  longitude: number,
  placeType?: PlaceType,
  radiusMeters = 50000,
  search?: string
): Promise<NearbyPlace[]> {
  const { data } = await api.post("/api/v1/doctors/nearby", {
    latitude,
    longitude,
    radius_meters: radiusMeters,
    place_type: placeType,
    search: search?.trim() || undefined,
  });

  return data.places.map((p: any) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    latitude: p.latitude,
    longitude: p.longitude,
    distanceKm: p.distance_km,
    address: p.address,
    phone: p.phone,
  }));
}
