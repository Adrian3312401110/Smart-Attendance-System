"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  ClipboardList, Settings, LogOut, GraduationCap,
  Search, Bell, Maximize, ChevronDown, Sun,
  SlidersHorizontal, Clock, UserX, Eye, Moon, UserMinus
} from "lucide-react";

function SidebarDosen() {
  const pathname = usePathname();
  const menu = [
    { icon: LayoutDashboard, href: "/dosen" },
    { icon: Users, href: "/dosen/mahasiswa" },
    { icon: Calendar, href: "/dosen/jadwal" },
    { icon: BarChart2, href: "/dosen/statistik" },
    { icon: ClipboardList, href: "/dosen/absensi" },
  ];
  return (
    <aside className="w-16 min-h-screen bg-[#1a1f36] flex flex-col items-center py-5 gap-5 fixed left-0 top-0 z-50">
      <div className="text-white mb-2"><GraduationCap size={24} /></div>
      <nav className="flex flex-col gap-2 flex-1">
        {menu.map((item) => (
          <Link key={item.href} href={item.href}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              pathname === item.href ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-blue-600 hover:text-white"
            }`}
          >
            <item.icon size={18} />
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 items-center">
        <Link href="/dosen/settings" className="text-slate-400 hover:text-white"><Settings size={18} /></Link>
        <Link href="/login" className="text-slate-400 hover:text-red-400"><LogOut size={18} /></Link>
      </div>
    </aside>
  );
}

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
  if (status === "tidak_hadir") return "bg-red-100 text-red-600";
  if (status === "terlambat") return "bg-yellow-100 text-yellow-600";
  return "bg-blue-100 text-blue-600";
}

function statusLabel(status: string) {
  if (status === "tidak_hadir") return "Tidak Hadir";
  if (status === "terlambat") return "Terlambat";
  return "Hadir";
}

export default function DosenAbsensiPage() {
  const [time, setTime] = useState("");
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [selectedJadwal, setSelectedJadwal] = useState<string>("");
  const [absensiData, setAbsensiData] = useState<AbsensiJadwalData | null>(null);
  const [search, setSearch] = useState("");
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
    fetch("http://localhost:8000/jadwal")
      .then((r) => r.json())
      .then((data) => {
        setJadwalList(data.data ?? []);
        if (data.data?.length > 0) {
          setSelectedJadwal(String(data.data[0].id));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedJadwal) return;
    setLoading(true);
    fetch(`http://localhost:8000/absensi/jadwal/${selectedJadwal}`)
      .then((r) => r.json())
      .then(setAbsensiData)
      .catch(() => setAbsensiData(null))
      .finally(() => setLoading(false));
  }, [selectedJadwal]);

  const todayShort = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const rows = absensiData?.data ?? [];
  const filteredRows = search
    ? rows.filter((r) => r.nama_mahasiswa.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalHadir = absensiData?.hadir ?? 0;
  const totalTerlambat = rows.filter((r) => r.status === "terlambat").length;
  const totalTidakHadir = rows.filter((r) => r.status === "tidak_hadir").length;

  const stats = [
    { label: "Total Mahasiswa Tercatat", value: absensiData?.total ?? 0, icon: Users, color: "bg-blue-100 text-blue-600", change: "Untuk jadwal terpilih", up: true },
    { label: "Hadir", value: totalHadir, icon: Clock, color: "bg-green-100 text-green-600", change: "Tepat waktu", up: true },
    { label: "Terlambat", value: totalTerlambat, icon: Eye, color: "bg-orange-100 text-orange-600", change: "Datang terlambat", up: false },
    { label: "Tidak Hadir", value: totalTidakHadir, icon: UserX, color: "bg-red-100 text-red-600", change: "Belum absen", up: false },
  ];

  const selectedJadwalInfo = jadwalList.find((j) => String(j.id) === selectedJadwal);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <SidebarDosen />
      <div className="ml-16 flex-1 flex flex-col">

        {/* Topbar */}
        <div className="bg-blue-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span className="text-white font-semibold text-base">Smart Attendance System</span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input placeholder="Quick Search..." className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full pl-8 pr-4 py-1.5 outline-none w-48" />
            </div>
            <Bell size={16} className="text-white cursor-pointer" />
            <Maximize size={16} className="text-white cursor-pointer" />
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm">D</div>
              <div className="text-left">
                <p className="text-white text-xs font-medium">Dosen</p>
                <p className="text-white/70 text-[11px]">dosen@polibatam.ac.id</p>
              </div>
              <ChevronDown size={12} className="text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 mb-4">Reports /</p>

          {/* Pilih Jadwal */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Jadwal Kelas</label>
            <select
              value={selectedJadwal}
              onChange={(e) => setSelectedJadwal(e.target.value)}
              className="w-full md:w-96 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-700 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sun size={16} />
                <span className="text-lg font-bold">{time}</span>
              </div>
              <p className="text-xs text-blue-200 mt-1">Today:</p>
              <p className="text-sm font-medium">{todayShort}</p>
            </div>
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className="text-xs text-slate-400">{s.change}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-slate-800 text-lg">
                Kehadiran {selectedJadwalInfo ? selectedJadwalInfo.id_mata_kuliah : ""}
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari mahasiswa..."
                    className="border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-sm outline-none w-44"
                  />
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium">
                  <SlidersHorizontal size={13} /> Advanced Filters
                </button>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
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
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400 text-sm">Memuat data...</td></tr>
                )}

                {!loading && filteredRows.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400 text-sm">Belum ada data absensi untuk jadwal ini.</td></tr>
                )}

                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-3 text-sm text-slate-500">{r.id_mahasiswa}</td>
                    <td className="py-3 px-3 text-sm font-medium text-slate-800">{r.nama_mahasiswa}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{r.tanggal}</td>
                    <td className="py-3 px-3 text-sm text-slate-600">{r.waktu}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${statusStyle(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600">
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
  );
}