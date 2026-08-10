"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyPlace } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  doctor: "#2F6FED",
  hospital: "#E0393F",
  clinic: "#0EA88B",
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
      box-shadow: 0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,0.15);
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

function FitBounds({ userLat, userLng, places }: { userLat: number; userLng: number; places: NearbyPlace[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (places.length > 0) {
      const bounds = L.latLngBounds([
        [userLat, userLng] as [number, number],
        ...places.map((p) => [p.latitude, p.longitude] as [number, number]),
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      map.setView([userLat, userLng], 12);
    }
  }, [map, userLat, userLng, places]);

  return null;
}

export function DoctorsMap({ userLat, userLng, places, selectedId }: DoctorsMapProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds userLat={userLat} userLng={userLng} places={places} />

      <Circle center={[userLat, userLng]} radius={300} pathOptions={{ color: "#2F6FED", fillOpacity: 0.1 }} />
      <Marker position={[userLat, userLng]} icon={createIcon("#2F6FED", true)}>
        <Popup>You are here</Popup>
      </Marker>

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={createIcon(TYPE_COLORS[place.type] ?? "#5B6577")}
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
