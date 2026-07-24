"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed, Search } from "lucide-react";

// @ts-expect-error - properti internal leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  lat: number;
  lon: number;
  radius: number;
  onChange: (lat: number, lon: number) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lon: number) => void }) {
  const map = useMap();
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return null;
}

function LocateButton({ onChange }: { onChange: (lat: number, lon: number) => void }) {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  function gunakanLokasiSaatIni() {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolocation");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 17);
        setLoading(false);
      },
      () => {
        alert("Gagal mengambil lokasi saat ini");
        setLoading(false);
      }
    );
  }

  return (
    <button
      type="button"
      onClick={gunakanLokasiSaatIni}
      title="Gunakan lokasi saya"
      className="absolute right-2.5 bottom-6 z-[1000] w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300"
    >
      <LocateFixed size={17} className={loading ? "animate-pulse" : ""} />
    </button>
  );
}

export default function LocationPicker({ lat, lon, radius, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  async function cariLokasi() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.length === 0) {
        alert("Lokasi tidak ditemukan");
        return;
      }
      const hasil = data[0];
      const newLat = parseFloat(hasil.lat);
      const newLon = parseFloat(hasil.lon);
      onChange(newLat, newLon);
      mapRef?.flyTo([newLat, newLon], 17);
    } catch {
      alert("Gagal mencari lokasi, coba lagi");
    } finally {
      setSearching(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      cariLokasi();
    }
  }

  return (
    <div>
      <div className="relative">
        <MapContainer
          center={[lat, lon]}
          zoom={17}
          style={{ height: 280, width: "100%", borderRadius: 12 }}
          ref={setMapRef}
          // key dihapus — MapContainer tidak boleh remount setiap klik
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[lat, lon]} />
          <Circle center={[lat, lon]} radius={radius} pathOptions={{ color: "#2563eb", fillOpacity: 0.1 }} />
          <ClickHandler onChange={onChange} />
          <LocateButton onChange={onChange} />
        </MapContainer>
      </div>

      <p className="text-[11px] text-slate-400 mt-2">
        {lat.toFixed(6)}, {lon.toFixed(6)}
      </p>

      {/* Bukan <form> lagi — supaya tidak bersarang di dalam <form> milik modal */}
      <div className="relative mt-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari lokasi, misal: Masjid Raya Batam..."
          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg pl-8 pr-20 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={cariLokasi}
          disabled={searching}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {searching ? "..." : "Cari"}
        </button>
      </div>
    </div>
  );
}