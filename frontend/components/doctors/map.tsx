"use client";

import { useEffect, useMemo } from "react";
import {
  Circle as GoogleCircle,
  GoogleMap,
  InfoWindow,
  LoadScript,
  Marker,
  useGoogleMap,
} from "@react-google-maps/api";
import { MapContainer, TileLayer, Marker as LMarker, Popup, Circle as LCircle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyPlace } from "@/types";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const TYPE_COLORS: Record<string, string> = {
  doctor: "#2F6FED",
  hospital: "#E0393F",
  clinic: "#0EA88B",
  pharmacy: "#F59E0B",
};

const MAP_STYLE = { width: "100%", height: "100%" };
const DEFAULT_ZOOM = 12;

interface DoctorsMapProps {
  userLat: number;
  userLng: number;
  places: NearbyPlace[];
  selectedId?: string | null;
}

// ---------------------------------------------------------------------------
// Google Maps
// ---------------------------------------------------------------------------

function GoogleFitBounds({ userLat, userLng, places }: { userLat: number; userLng: number; places: NearbyPlace[] }) {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map) return;
    if (places.length > 0) {
      const lats = [userLat, ...places.map((p) => p.latitude)];
      const lngs = [userLng, ...places.map((p) => p.longitude)];
      map.fitBounds({
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      });
      const listener = map.addListener("idle", () => {
        if ((map.getZoom() ?? DEFAULT_ZOOM) > 15) map.setZoom(15);
      });
      return () => listener.remove();
    }
    map.setCenter({ lat: userLat, lng: userLng });
    map.setZoom(DEFAULT_ZOOM);
  }, [map, userLat, userLng, places]);

  return null;
}

const DOT_SVG = "M0 0m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0";

function dotIcon(color: string, scale = 2.2) {
  return {
    path: DOT_SVG,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
  };
}

function GoogleDoctorsMap({ userLat, userLng, places, selectedId }: DoctorsMapProps) {
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const center = useMemo(() => ({ lat: userLat, lng: userLng }), [userLat, userLng]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY!}>
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={center}
        zoom={DEFAULT_ZOOM}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        <GoogleFitBounds userLat={userLat} userLng={userLng} places={places} />

        <GoogleCircle
          center={center}
          radius={300}
          options={{ strokeColor: "#2F6FED", strokeOpacity: 0.8, fillColor: "#2F6FED", fillOpacity: 0.1 }}
        />
        <Marker position={center} icon={dotIcon("#2F6FED", 2.6)} title="You are here" />

        {places.map((place) => (
          <Marker
            key={place.id}
            position={{ lat: place.latitude, lng: place.longitude }}
            icon={dotIcon(TYPE_COLORS[place.type] ?? "#5B6577")}
            title={place.name}
          />
        ))}

        {selected && (
          <InfoWindow position={{ lat: selected.latitude, lng: selected.longitude }}>
            <div className="text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{selected.type}</p>
              <p className="text-xs">{selected.distanceKm} km away</p>
              {selected.address && <p className="text-xs">{selected.address}</p>}
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-blue-600 underline"
              >
                Get directions
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}

// ---------------------------------------------------------------------------
// Leaflet fallback (used when no Google Maps key is configured)
// ---------------------------------------------------------------------------

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

function LeafletFitBounds({ userLat, userLng, places }: { userLat: number; userLng: number; places: NearbyPlace[] }) {
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
      map.setView([userLat, userLng], DEFAULT_ZOOM);
    }
  }, [map, userLat, userLng, places]);

  return null;
}

function LeafletDoctorsMap({ userLat, userLng, places, selectedId }: DoctorsMapProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LeafletFitBounds userLat={userLat} userLng={userLng} places={places} />

      <LCircle center={[userLat, userLng]} radius={300} pathOptions={{ color: "#2F6FED", fillOpacity: 0.1 }} />
      <LMarker position={[userLat, userLng]} icon={createIcon("#2F6FED", true)}>
        <Popup>You are here</Popup>
      </LMarker>

      {places.map((place) => (
        <LMarker
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
                href={`https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary underline"
              >
                Get directions
              </a>
            </div>
          </Popup>
        </LMarker>
      ))}
    </MapContainer>
  );
}

// ---------------------------------------------------------------------------
// Public component: Google Maps when a key is set, Leaflet otherwise
// ---------------------------------------------------------------------------

export function DoctorsMap(props: DoctorsMapProps) {
  if (GOOGLE_MAPS_API_KEY) {
    return <GoogleDoctorsMap {...props} />;
  }
  return <LeafletDoctorsMap {...props} />;
}
