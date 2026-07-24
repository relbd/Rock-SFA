"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import type { RoutePoint } from "@/services/api";

interface RouteMapProps {
  route: RoutePoint[];
  /** When true, renders the side timeline panel alongside the map */
  showTimeline?: boolean;
  /** Height class for the map container */
  heightClass?: string;
}

// Haversine distance in km between two lat/lng points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RouteMap({
  route,
  showTimeline = false,
  heightClass = "h-64",
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Precompute distances between consecutive stops
  const distances = route.map((point, idx) => {
    if (idx === 0) return 0;
    const prev = route[idx - 1];
    const lat1 = Number(prev.lat);
    const lng1 = Number(prev.lng);
    const lat2 = Number(point.lat);
    const lng2 = Number(point.lng);
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 0;
    return haversineKm(lat1, lng1, lat2, lng2);
  });

  const totalDistance = distances.reduce((sum, d) => sum + d, 0);

  useEffect(() => {
    if (!mapRef.current || route.length === 0) return;

    let L: any;

    const init = async () => {
      L = await import("leaflet");

      // Fix default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Remove existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // Numbered icons with color coding: start=blue, end=green, middle=gray, active=blue ring
      const createNumberIcon = (num: number, isStart: boolean, isEnd: boolean, isActive: boolean) => {
        const color = isStart ? "#2563eb" : isEnd ? "#16a34a" : "#6b7280";
        const size = isActive ? 34 : 28;
        const ring = isActive ? "box-shadow:0 0 0 4px rgba(37,99,235,0.3);" : "box-shadow:0 2px 4px rgba(0,0,0,0.3);";
        return L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;${ring}">${num}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      };

      const markers: any[] = [];
      const coords: [number, number][] = [];

      route.forEach((point, idx) => {
        const lat = Number(point.lat);
        const lng = Number(point.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        coords.push([lat, lng]);

        const icon = createNumberIcon(idx + 1, idx === 0, idx === route.length - 1, false);
        const marker = L.marker([lat, lng], { icon }).addTo(map);

        const timeStr = point.time
          ? new Date(point.time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          : "";

        const distStr = idx > 0 && distances[idx] > 0 ? `${distances[idx].toFixed(2)} km from prev` : "Starting point";

        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:170px">
            <div style="font-size:14px;font-weight:bold;color:#1e40af">#${idx + 1} - ${point.name}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px">📍 ${point.area}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:1px">🕐 ${timeStr}</div>
            <div style="font-size:11px;color:#2563eb;margin-top:1px">🛣️ ${distStr}</div>
          </div>
        `);

        marker.on("click", () => setActiveIdx(idx));
        markers.push(marker);
      });

      markersRef.current = markers;

      // Draw route lines with gradient effect
      if (coords.length > 1) {
        L.polyline(coords, {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.7,
          dashArray: "8, 6",
        }).addTo(map);

        // Direction arrows at midpoints
        for (let i = 0; i < coords.length - 1; i++) {
          const from = coords[i];
          const to = coords[i + 1];
          const midLat = (from[0] + to[0]) / 2;
          const midLng = (from[1] + to[1]) / 2;
          const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * (180 / Math.PI);

          L.marker([midLat, midLng], {
            icon: L.divIcon({
              html: `<div style="transform:rotate(${-angle + 90}deg);color:#3b82f6;font-size:16px;text-shadow:0 0 3px white,0 0 3px white">▸</div>`,
              className: "",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(map);
        }
      }

      // Fit bounds
      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [40, 40] });
      }

      // Open first marker popup
      if (markers.length > 0) {
        markers[0].openPopup();
      }

      mapInstanceRef.current = map;
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [route, distances]);

  // Fly to marker when activeIdx changes
  useEffect(() => {
    if (activeIdx === null || !mapInstanceRef.current || !markersRef.current[activeIdx]) return;
    const point = route[activeIdx];
    if (!point) return;
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
      markersRef.current[activeIdx].openPopup();
    }
  }, [activeIdx, route]);

  // Route playback animation
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }

    const nextIdx = activeIdx === null ? 0 : activeIdx + 1;
    if (nextIdx >= route.length) {
      setIsPlaying(false);
      return;
    }

    playbackTimerRef.current = setTimeout(() => {
      setActiveIdx(nextIdx);
    }, 1800);

    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [isPlaying, activeIdx, route.length]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      const startIdx = activeIdx === null || activeIdx >= route.length - 1 ? 0 : activeIdx;
      setActiveIdx(startIdx);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setActiveIdx((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setActiveIdx((prev) => (prev === null ? 0 : Math.min(route.length - 1, prev + 1)));
  };

  if (showTimeline) {
    return (
      <div className="flex flex-col md:flex-row gap-3">
        <div className="w-full md:w-3/5 relative">
          <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative`}>
            <link
              rel="stylesheet"
              href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
            />
            <div ref={mapRef} className="h-full w-full" />
          </div>

          {/* Playback controls overlay */}
          {route.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur rounded-full shadow-lg flex items-center gap-1 px-2 py-1.5 border border-gray-200">
              <button
                onClick={handlePrev}
                disabled={activeIdx === 0}
                aria-label="Previous stop"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handlePlayPause}
                aria-label={isPlaying ? "Pause" : "Play route"}
                className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={handleNext}
                disabled={activeIdx === route.length - 1}
                aria-label="Next stop"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="w-full md:w-2/5 max-h-64 md:max-h-none overflow-y-auto bg-gray-50 rounded-lg p-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-gray-500">ROUTE TIMELINE</p>
            <p className="text-[10px] text-gray-400">{totalDistance.toFixed(2)} km total</p>
          </div>
          <div className="space-y-1">
            {route.map((point, idx) => {
              const timeStr = point.time
                ? new Date(point.time).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
                : "";
              const isActive = activeIdx === idx;
              const isStart = idx === 0;
              const isEnd = idx === route.length - 1;
              const distFromPrev = distances[idx];
              return (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? "bg-blue-100 ring-1 ring-blue-300" : "hover:bg-gray-100"
                    }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isStart ? "bg-blue-600" : isEnd ? "bg-green-600" : "bg-gray-500"
                      }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 truncate">{point.name}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-gray-500 truncate">{point.area}</p>
                      {idx > 0 && distFromPrev > 0 && (
                        <span className="text-[9px] text-blue-500 shrink-0">· {distFromPrev.toFixed(1)}km</span>
                      )}
                    </div>
                  </div>
                  {timeStr && <span className="text-[10px] text-gray-400 shrink-0">{timeStr}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={mapRef} className="h-full w-full" />
    </>
  );
}
