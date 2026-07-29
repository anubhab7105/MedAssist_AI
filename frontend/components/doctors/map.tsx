"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyPlace } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  doctor: "#2563EB",
  hospital: "#EF4444",
  clinic: "#14B8A6",
  pharmacy: "#F59E0B",
};

function createIcon(color: string, isUser = false) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: ${isUser ? 18 : 14}px;
      height: ${isUser ? 18 : 14}px;
      border-radius: 9999px;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 0 0 4px ${color}33;
    "></div>`,
    iconSize: [isUser ? 18 : 14, isUser ? 18 : 14],
    iconAnchor: [isUser ? 9 : 7, isUser ? 9 : 7],
  });
}

interface DoctorsMapProps {
  userLat: number;
  userLng: number;
  places: NearbyPlace[];
  selectedId?: string | null;
}

export function DoctorsMap({ userLat, userLng, places, selectedId }: DoctorsMapProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle center={[userLat, userLng]} radius={300} pathOptions={{ color: "#2563EB", fillOpacity: 0.08 }} />
      <Marker position={[userLat, userLng]} icon={createIcon("#2563EB", true)}>
        <Popup>You are here</Popup>
      </Marker>

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={createIcon(TYPE_COLORS[place.type] ?? "#94A3B8")}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{place.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{place.type}</p>
              <p className="text-xs">{place.distanceKm} km away</p>
              {place.address && <p className="text-xs">{place.address}</p>}
              <a
                href={`https://www.openstreetmap.org/directions?from=${userLat}%2C${userLng}&to=${place.latitude}%2C${place.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary underline"
              >
                Get directions
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
