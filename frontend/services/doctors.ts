import { api } from "@/lib/api";
import type { NearbyPlace, PlaceType } from "@/types";

export async function findNearbyPlaces(
  latitude: number,
  longitude: number,
  placeType?: PlaceType,
  radiusMeters = 5000
): Promise<NearbyPlace[]> {
  const { data } = await api.post("/api/doctors/nearby", {
    latitude,
    longitude,
    radius_meters: radiusMeters,
    place_type: placeType,
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
