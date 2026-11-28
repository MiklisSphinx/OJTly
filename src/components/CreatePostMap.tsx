'use client';

// =============================================================
// CreatePostMap.tsx — Self-contained Leaflet map wrapper.
//
// WHY RAW LEAFLET (not react-leaflet):
//   react-leaflet v4's <MapContainer> has a known bug with
//   React StrictMode (Next.js 16 enables it by default in dev).
//   StrictMode double-mounts components: mount → unmount → mount.
//   react-leaflet's internal cleanup calls map.remove(), but
//   Leaflet leaves a `_leaflet_id` marker on the container DOM
//   element. On the second mount, react-leaflet tries to init
//   a new map on the same container and throws:
//     "Map container is being reused by another instance"
//     "Cannot read properties of undefined (reading 'appendChild')"
//
//   The fix: bypass react-leaflet entirely. Use raw Leaflet with
//   a <div ref> and our own useEffect lifecycle. We can clean up
//   _leaflet_id + innerHTML explicitly before re-creating the map,
//   so StrictMode's second mount sees a pristine container.
//
//   This is the SAME pattern your student_ai and map pages use,
//   which is why they work in StrictMode and this one didn't.
// =============================================================

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapLayer = 'standard' | 'grey' | 'satellite';

const TILE_URLS: Record<MapLayer, string> = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  grey: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const SATELLITE_LABEL_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export default function CreatePostMap({
  center,
  mapLayer,
  marker,
  onMapClick,
}: {
  center: [number, number];
  mapLayer: MapLayer;
  marker: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const labelTileRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Stash the latest onMapClick in a ref so the map's click handler
  // always calls the freshest callback without needing to re-bind.
  const clickHandlerRef = useRef(onMapClick);
  clickHandlerRef.current = onMapClick;

  // -----------------------------------------------------------
  // Effect 1: Create the map ONCE on mount, clean up on unmount.
  // This is the critical StrictMode-safe lifecycle.
  // -----------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Defensive: if a previous Leaflet instance left state on this
    // container (StrictMode remount, HMR, etc.), wipe it BEFORE
    // trying to create a new map. This is the line that fixes
    // "Map container is being reused by another instance".
    if ((el as any)._leaflet_id) {
      try {
        (el as any)._leaflet_map?.remove();
      } catch (e) {
        /* ignore */
      }
      delete (el as any)._leaflet_id;
      el.innerHTML = '';
    }

    // Fix default marker icons (Next.js/webpack breaks leaflet's
    // relative image URLs by default).
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Create the map.
    const map = L.map(el, {
      center,
      zoom: 13,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      clickHandlerRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      // StrictMode unmount: remove the map AND scrub the container
      // so the next mount can create a fresh one without complaint.
      try {
        map.remove();
      } catch (e) {
        /* ignore */
      }
      mapRef.current = null;
      baseTileRef.current = null;
      labelTileRef.current = null;
      markerRef.current = null;
      try {
        delete (el as any)._leaflet_id;
        el.innerHTML = '';
      } catch (e) {
        /* ignore */
      }
    };
    // Empty dep array → run once on mount, clean up on unmount.
    // center[0]/center[1] are NOT in deps because we don't want
    // to recreate the map when the parent re-centers; the
    // separate Effect 3 handles flyTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------
  // Effect 2: (Re)draw tile layers whenever mapLayer changes.
  // Also runs once after the map exists on initial mount.
  // -----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Tear down any existing tile layers.
    if (baseTileRef.current) {
      try {
        baseTileRef.current.remove();
      } catch (e) {
        /* ignore */
      }
      baseTileRef.current = null;
    }
    if (labelTileRef.current) {
      try {
        labelTileRef.current.remove();
      } catch (e) {
        /* ignore */
      }
      labelTileRef.current = null;
    }

    // Add the base layer for the current style.
    baseTileRef.current = L.tileLayer(TILE_URLS[mapLayer], {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Satellite view gets a transparent label overlay so place
    // names are visible on top of the imagery.
    if (mapLayer === 'satellite') {
      labelTileRef.current = L.tileLayer(SATELLITE_LABEL_URL, {
        zIndex: 1000,
      }).addTo(map);
    }
  }, [mapLayer]);

  // -----------------------------------------------------------
  // Effect 3: Fly to the new center when the parent passes a
  // new center (search result, Locate Me, etc.).
  // -----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.flyTo(center, map.getZoom());
    } catch (e) {
      /* map not ready yet — ignore */
    }
  }, [center]);

  // -----------------------------------------------------------
  // Effect 4: Add / move / remove the pin marker.
  // -----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      try {
        markerRef.current.remove();
      } catch (e) {
        /* ignore */
      }
      markerRef.current = null;
    }

    if (marker) {
      markerRef.current = L.marker([marker.lat, marker.lng]).addTo(map);
    }
  }, [marker]);

  // The container div. Leaflet will take over this element.
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}