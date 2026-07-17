"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Sun, Cloud,
  Clock, UserX, Eye, Users
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface JadwalItem {
  id: number;
  id_dosen: string;
  id_mata_kuliah: string;
  hari: string;
  jam: string;
}

interface AbsensiRow {
  id: number;
  id_mahasiswa: string;
  nama_mahasiswa: string;
  tanggal: string;
  waktu: string;
  status: string;
  confidence: number | null;
}

interface AbsensiJadwalData {
  id_jadwal: number;
  id_mata_kuliah: string;
  total: number;
  hadir: number;
  data: AbsensiRow[];
}

function statusStyle(status: string) {
  if (status === "tidak_hadir") return "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300";
  if (status === "terlambat") return "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-300";
  return "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300";
}

function statusLabel(status: string) {
  if (status === "tidak_hadir") return "Tidak Hadir";
  if (status === "terlambat") return "Terlambat";
  return "Hadir";
}

export default function DosenAbsensiPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [selectedJadwal, setSelectedJadwal] = useState<string>("");
  const [absensiData, setAbsensiData] = useState<AbsensiJadwalData | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setTime(`${h}:${m}:${s} ${ampm}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) {
      router.replace("/auth/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as { id: string; name: string; email: string; role: string };
      if (parsedUser.role !== "dosen") {
        router.replace("/mahasiswa");
        return;
      }
      setAuthUser(parsedUser);
    } catch {
      router.replace("/auth/login");
    }
  }, [router]);

useEffect(() => {
  if (!authUser?.id) return;
  fetch("http://localhost:8000/jadwal")
    .then((r) => r.json())
    .then((data) => {
      const filteredJadwal = (data.data ?? []).filter((item: JadwalItem) => item.id_dosen === authUser.id);
      setJadwalList(filteredJadwal);
      if (filteredJadwal.length > 0) {
        setSelectedJadwal(String(filteredJadwal[0].id));
      }
    })
    .catch(() => {});
  fetch(`http://localhost:8000/dosen/${authUser.id}`)
    .then((r) => r.json())
    .then((data) => setFotoUrl(data?.foto_url ?? null))
    .catch(() => {});
}, [authUser]);

  useEffect(() => {
    if (!selectedJadwal) return;
    setLoading(true);
    fetch(`http://localhost:8000/absensi/jadwal/${selectedJadwal}`)
      .then((r) => r.json())
      .then(setAbsensiData)
      .catch(() => setAbsensiData(null))
      .finally(() => setLoading(false));
  }, [selectedJadwal]);

  const todayShort = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const userInitials = (authUser?.name ?? "D")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  let filteredRows = absensiData?.data ?? [];
  if (search) {
    filteredRows = filteredRows.filter((r) => r.nama_mahasiswa.toLowerCase().includes(search.toLowerCase()));
  }
  if (filterStatus !== "semua") {
    filteredRows = filteredRows.filter((r) => r.status === filterStatus);
  }

  const totalHadir = absensiData?.hadir ?? 0;
  const totalTerlambat = (absensiData?.data ?? []).filter((r) => r.status === "terlambat").length;
  const totalTidakHadir = (absensiData?.data ?? []).filter((r) => r.status === "tidak_hadir").length;

  const stats = [
    { label: "Total Mahasiswa Tercatat", value: absensiData?.total ?? 0, icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300", change: "Untuk jadwal terpilih", up: true },
    { label: "Hadir", value: totalHadir, icon: Clock, color: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300", change: "Tepat waktu", up: true },
    { label: "Terlambat", value: totalTerlambat, icon: Eye, color: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300", change: "Datang terlambat", up: false },
    { label: "Tidak Hadir", value: totalTidakHadir, icon: UserX, color: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300", change: "Belum absen", up: false },
  ];

  const selectedJadwalInfo = jadwalList.find((j) => String(j.id) === selectedJadwal);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <SidebarNav role="dosen" />
      <div className="flex-1 flex flex-col">

        {/* Topbar */}
        <div className="bg-blue-700 dark:bg-blue-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span className="text-white font-semibold text-base">Smart Attendance System</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-default">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">{fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : userInitials}</div>
              <div className="text-left">
                <p className="text-white text-xs font-medium">{authUser?.name ?? "Dosen"}</p>
                <p className="text-white/70 text-[11px]">{authUser?.email ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Laporan / <span className="text-blue-600 dark:text-blue-400 font-medium">Data Absensi</span></p>

          {/* Pilih Jadwal */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 mb-6 border border-transparent dark:border-slate-800">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Pilih Jadwal Kelas</label>
            <select
              value={selectedJadwal}
              onChange={(e) => setSelectedJadwal(e.target.value)}
              className="w-full md:w-96 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {jadwalList.length === 0 && <option value="">Belum ada jadwal</option>}
              {jadwalList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.id_mata_kuliah} • {j.hari} {j.jam}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-700 dark:bg-blue-800 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sun size={18} />
                <span className="text-xl font-bold">{time}</span>
              </div>
              <p className="text-xs text-blue-200 mt-2">Hari ini:</p>
              <p className="text-sm font-medium">{todayShort}</p>
              <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
                <Cloud size={12} /> Cuaca: Cerah Berawan
              </p>
            </div>
            {stats.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-transparent dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{s.change}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">
                Kehadiran {selectedJadwalInfo ? selectedJadwalInfo.id_mata_kuliah : ""}
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari mahasiswa..."
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg pl-8 pr-4 py-1.5 text-sm outline-none w-44"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors"
                >
                  <option value="semua">Semua Status</option>
                  <option value="hadir">Hadir</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="tidak_hadir">Alfa / Tidak Hadir</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 px-3">ID</th>
                    <th className="pb-3 px-3">Mahasiswa</th>
                    <th className="pb-3 px-3">Tanggal</th>
                    <th className="pb-3 px-3">Waktu</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Akurasi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Memuat data...</td></tr>
                  )}

                  {!loading && filteredRows.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Belum ada data absensi untuk jadwal ini.</td></tr>
                  )}

                  {filteredRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{r.id_mahasiswa}</td>
                      <td className="py-3 px-3 text-sm font-medium text-slate-800 dark:text-slate-100">{r.nama_mahasiswa}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{r.tanggal}</td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">{r.waktu}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${statusStyle(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">
                        {r.confidence !== null ? `${(r.confidence * 100).toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}