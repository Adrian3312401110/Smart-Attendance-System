"use client";

import { useEffect, useState } from "react";
import SidebarMahasiswa from "@/components/SidebarMahasiswa";

const NIM = "3312401110";

interface RiwayatItem {
  id: number;
  mata_kuliah: string;
  tanggal: string;
  waktu: string;
  status: string;
  confidence: number | null;
}

interface RiwayatData {
  id_mahasiswa: string;
  total_pertemuan: number;
  hadir: number;
  terlambat: number;
  tidak_hadir: number;
  data: RiwayatItem[];
}

export default function RiwayatMahasiswaPage() {
  const [riwayat, setRiwayat] = useState<RiwayatData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8000/absensi/mahasiswa/${NIM}`)
      .then((r) => r.json())
      .then(setRiwayat)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const data = riwayat?.data ?? [];
  const filtered = search
    ? data.filter((item) => item.mata_kuliah.toLowerCase().includes(search.toLowerCase()))
    : data;

  return (
    <main className="min-h-screen bg-slate-100 flex">
      <SidebarMahasiswa />

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Riwayat Saya</h1>
            <p className="text-sm text-slate-500">
              Lihat riwayat absensi Anda per mata kuliah dan pertemuan.
            </p>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-4 gap-5">
          <StatCard title="Total Pertemuan" value={riwayat?.total_pertemuan ?? 0} color="border-blue-200" />
          <StatCard title="Hadir" value={riwayat?.hadir ?? 0} color="border-green-200" />
          <StatCard title="Terlambat" value={riwayat?.terlambat ?? 0} color="border-yellow-200" />
          <StatCard title="Tidak Hadir" value={riwayat?.tidak_hadir ?? 0} color="border-red-200" />
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-xl font-bold">Riwayat Absensi</h2>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mata kuliah..."
              className="w-64 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-5">Mata Kuliah</th>
                <th className="p-5">Tanggal</th>
                <th className="p-5">Waktu</th>
                <th className="p-5">Status</th>
                <th className="p-5">Akurasi</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Memuat data...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              )}

              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-5 font-semibold">{item.mata_kuliah}</td>
                  <td className="p-5">{item.tanggal}</td>
                  <td className="p-5">{item.waktu}</td>
                  <td className="p-5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="p-5">
                    {item.confidence !== null ? `${(item.confidence * 100).toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-6 shadow ${color}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-3 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "hadir"
      ? "bg-green-100 text-green-600"
      : status === "terlambat"
      ? "bg-yellow-100 text-yellow-600"
      : "bg-red-100 text-red-600";

  const label =
    status === "hadir" ? "Hadir" : status === "terlambat" ? "Terlambat" : "Tidak Hadir";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}