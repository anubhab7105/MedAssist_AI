"use client";

import { useCallback, useState } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Your browser doesn't support location access." }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location access was denied. Enable it in your browser settings to find nearby care."
            : "Couldn't determine your location. Please try again.";
        setState((s) => ({ ...s, loading: false, error: message }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { ...state, requestLocation };
}
