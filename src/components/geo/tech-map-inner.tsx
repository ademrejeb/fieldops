"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapTech = { id: string; name: string; lat: number; lng: number; status: string; sub?: string };
export type MapSite = { id: string; name: string; lat: number; lng: number; sub?: string };

function dot(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);color:#fff;font-size:12px;font-weight:800;">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
const siteIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:4px;background:#f59e0b;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);transform:rotate(45deg);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function Fit({ techs, sites }: { techs: MapTech[]; sites: MapSite[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = [...techs.map((t) => [t.lat, t.lng] as [number, number]), ...sites.map((s) => [s.lat, s.lng] as [number, number])];
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.25));
    else if (pts.length === 1) map.setView(pts[0], 13);
  }, [map, techs, sites]);
  return null;
}

export default function TechMapInner({ techs, sites }: { techs: MapTech[]; sites: MapSite[] }) {
  const center: [number, number] = techs[0] ? [techs[0].lat, techs[0].lng] : [33.5731, -7.5898];
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={true} className="h-full w-full rounded-lg" style={{ minHeight: 220 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Fit techs={techs} sites={sites} />
      {sites.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={siteIcon}>
          <Popup><b>{s.name}</b>{s.sub && <div style={{ fontSize: 12 }}>{s.sub}</div>}</Popup>
        </Marker>
      ))}
      {techs.map((t) => (
        <Marker
          key={t.id}
          position={[t.lat, t.lng]}
          icon={dot(t.status === "ON_JOB" ? "#2563eb" : t.status === "OFFLINE" ? "#94a3b8" : "#059669", t.name.trim()[0] ?? "T")}
        >
          <Popup><b>{t.name}</b><div style={{ fontSize: 12 }}>{t.status === "ON_JOB" ? "En mission" : t.status === "OFFLINE" ? "Hors ligne" : "Disponible"}{t.sub ? ` · ${t.sub}` : ""}</div></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
