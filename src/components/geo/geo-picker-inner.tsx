"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:9999px 9999px 9999px 0;background:#1d4ed8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(-45deg);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 20],
});

function Click({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(Math.round(e.latlng.lat * 100000) / 100000, Math.round(e.latlng.lng * 100000) / 100000);
    },
  });
  return null;
}

/** Click-to-set coordinates picker (draggable pin). */
export default function GeoPickerInner({ lat, lng, onChange }: {
  lat: number; lng: number; onChange: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={[lat, lng]} zoom={13} scrollWheelZoom={false} className="h-44 w-full rounded-lg border border-slate-200 dark:border-slate-800">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Click onChange={onChange} />
      <Marker
        position={[lat, lng]}
        icon={pin}
        draggable
        eventHandlers={{
          dragend(e) {
            const m = e.target as L.Marker;
            const p = m.getLatLng();
            onChange(Math.round(p.lat * 100000) / 100000, Math.round(p.lng * 100000) / 100000);
          },
        }}
      />
    </MapContainer>
  );
}
