"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";

interface AuthUser {
  id: string;
  name: string;
  role: string;
}

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
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) {
      router.replace("/auth/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;
      if (parsedUser.role !== "mahasiswa") {
        router.replace("/dosen");
        return;
      }
      setUser(parsedUser);
    } catch {
      router.replace("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMsg("");

    fetch(`http://localhost:8000/absensi/mahasiswa/${user.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat riwayat absensi");
        return r.json();
      })
      .then((data: RiwayatData) => setRiwayat(data))
      .catch(() => setErrorMsg("Tidak dapat terhubung ke server. Pastikan backend berjalan."))
      .finally(() => setLoading(false));
  }, [user]);

  const data = riwayat?.data ?? [];
  const filtered = search
    ? data.filter((item) => item.mata_kuliah.toLowerCase().includes(search.toLowerCase()))
    : data;

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      <SidebarNav role="mahasiswa" />

      <section className="flex-1 p-8">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Riwayat Saya</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Lihat riwayat absensi Anda per mata kuliah dan pertemuan.
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-3 text-sm text-red-600 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <section className="mb-6 grid grid-cols-4 gap-5">
          <StatCard title="Total Pertemuan" value={riwayat?.total_pertemuan ?? 0} color="border-blue-200 dark:border-blue-900" />
          <StatCard title="Hadir" value={riwayat?.hadir ?? 0} color="border-green-200 dark:border-green-900" />
          <StatCard title="Terlambat" value={riwayat?.terlambat ?? 0} color="border-yellow-200 dark:border-yellow-900" />
          <StatCard title="Tidak Hadir" value={riwayat?.tidak_hadir ?? 0} color="border-red-200 dark:border-red-900" />
        </section>

        <section className="rounded-2xl bg-card text-card-foreground border border-border shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h2 className="text-xl font-bold">Riwayat Absensi</h2>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mata kuliah..."
              className="w-64 rounded-xl border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            />
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
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
                  <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              )}

              {!loading && !errorMsg && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              )}

              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-border">
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
    <div className={`rounded-2xl border bg-card text-card-foreground p-6 shadow ${color}`}>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <h2 className="mt-3 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "hadir"
      ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300"
      : status === "terlambat"
      ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300"
      : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300";

  const label =
    status === "hadir" ? "Hadir" : status === "terlambat" ? "Terlambat" : "Tidak Hadir";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}