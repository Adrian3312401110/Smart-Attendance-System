"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Maximize, ChevronDown, Sun,
  Clock, UserX, Eye, Moon, UserMinus, Trophy, Users
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface RingkasanAbsensi {
  total_mahasiswa: number;
  total_jadwal: number;
  total_absensi: number;
  total_hadir: number;
  total_terlambat: number;
  total_tidak_hadir: number;
  hari_ini_hadir: number;
  hari_ini_terlambat: number;
  hari_ini_tidak_hadir: number;
}

interface TopMahasiswa {
  id_mahasiswa: string;
  nama_mahasiswa: string;
  angkatan: string | null;
  jumlah_hadir: number;
  persen_kehadiran: number;
}

interface TrenHarian {
  tanggal: string;
  label: string;
  persen_hadir: number;
  total: number;
}

interface KehadiranMatkul {
  id_jadwal: number;
  nama_mata_kuliah: string;
  persen_hadir: number;
  total_absensi: number;
}

const RANK_COLORS = ["bg-yellow-400", "bg-slate-300", "bg-amber-600", "bg-blue-200", "bg-blue-200"];

function buildLinePath(data: { persen_hadir: number }[], width: number, height: number) {
  if (data.length < 2) return "";
  const max = 100;
  const stepX = width / (data.length - 1);
  return data
    .map((d, i) => {
      const x = i * stepX;
      const y = height - (d.persen_hadir / max) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function DosenStatistikPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [kelasSummary, setKelasSummary] = useState({ totalKelas: 0, totalMahasiswa: 0, totalJadwal: 0 });
  const [ringkasan, setRingkasan] = useState<RingkasanAbsensi | null>(null);
  const [topMahasiswa, setTopMahasiswa] = useState<TopMahasiswa[]>([]);
  const [trenHarian, setTrenHarian] = useState<TrenHarian[]>([]);
  const [kehadiranMatkul, setKehadiranMatkul] = useState<KehadiranMatkul[]>([]);

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

    Promise.all([
      fetch(`http://localhost:8000/kelas?id_dosen=${authUser.id}`).then((r) => r.json()),
      fetch("http://localhost:8000/jadwal/detail").then((r) => r.json()),
      fetch(`http://localhost:8000/dosen/${authUser.id}/ringkasan-absensi`).then((r) => r.json()),
      fetch(`http://localhost:8000/dosen/${authUser.id}/top-mahasiswa`).then((r) => r.json()),
      fetch(`http://localhost:8000/dosen/${authUser.id}/tren-kehadiran?hari=14`).then((r) => r.json()),
      fetch(`http://localhost:8000/dosen/${authUser.id}/kehadiran-per-matkul`).then((r) => r.json()),
      fetch(`http://localhost:8000/dosen/${authUser.id}`).then((r) => r.json()),
    ])
      .then(([kelasRes, jadwalRes, ringkasanRes, topRes, trenRes, matkulRes, dosenRes]) => {
        const kelasData = kelasRes.data ?? [];
        const jadwalData = (jadwalRes.data ?? []).filter((item: { id_dosen: string }) => item.id_dosen === authUser.id);
        setKelasSummary({
          totalKelas: kelasData.length,
          totalMahasiswa: kelasData.reduce((sum: number, item: { total_mahasiswa: number }) => sum + (item.total_mahasiswa ?? 0), 0),
          totalJadwal: jadwalData.length,
        });
        setRingkasan(ringkasanRes);
        setTopMahasiswa(topRes.data ?? []);
        setTrenHarian(trenRes.data ?? []);
        setKehadiranMatkul(matkulRes.data ?? []);
        setFotoUrl(dosenRes?.foto_url ?? null);
      })
      .catch(() => {});
  }, [authUser]);

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

  const todayShort = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const stats1 = [
    { label: "Total Kelas", value: kelasSummary.totalKelas, icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300", desc: "Untuk akun dosen aktif" },
    { label: "Mahasiswa Tergabung", value: kelasSummary.totalMahasiswa, icon: Clock, color: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300", desc: "Berdasarkan kelas Anda" },
    { label: "Jadwal Aktif", value: kelasSummary.totalJadwal, icon: UserX, color: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300", desc: "Semua jadwal milik Anda" },
  ];

  const stats2 = [
    { label: "Kehadiran Hari Ini", value: ringkasan?.hari_ini_hadir ?? 0, icon: Eye, color: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300" },
    { label: "Terlambat", value: ringkasan?.hari_ini_terlambat ?? 0, icon: Moon, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300" },
    { label: "Tidak Hadir", value: ringkasan?.hari_ini_tidak_hadir ?? 0, icon: UserMinus, color: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300" },
  ];

  const chartWidth = 760;
  const chartHeight = 180;
  const linePath = buildLinePath(trenHarian, chartWidth, chartHeight);
  const userInitials = (authUser?.name ?? "D")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const matkulMax = Math.max(...kehadiranMatkul.map((d) => d.persen_hadir), 1);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <SidebarNav role="dosen" />
      <div className="flex-1 flex flex-col">

        <div className="bg-blue-700 dark:bg-blue-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span className="text-white font-semibold text-base">Smart Attendance System</span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input placeholder="Quick Search..." className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full pl-8 pr-4 py-1.5 outline-none w-48" />
            </div>
            <Bell size={16} className="text-white cursor-pointer" />
            <Maximize size={16} className="text-white cursor-pointer" />
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                {fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : userInitials}
              </div>
              <div className="text-left">
                <p className="text-white text-xs font-medium">{authUser?.name ?? "Dosen"}</p>
                <p className="text-white/70 text-[11px]">{authUser?.email ?? "-"}</p>
              </div>
              <ChevronDown size={12} className="text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Dashboard / <span className="text-blue-600 dark:text-blue-400 font-medium">Attendance Insights</span></p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-700 dark:bg-blue-800 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sun size={18} />
                <span className="text-xl font-bold">{time}</span>
              </div>
              <p className="text-xs text-blue-200">Today:</p>
              <p className="text-sm font-medium">{todayShort}</p>
            </div>
            {stats1.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-transparent dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {stats2.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-transparent dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 mb-6 border border-transparent dark:border-slate-800">
            <div className="flex items-center gap-2 mb-5">
              <Trophy size={18} className="text-yellow-500 dark:text-yellow-400" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Top Performing Students</h2>
            </div>

            {topMahasiswa.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Belum ada data kehadiran untuk kelas Anda.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {topMahasiswa.map((s, i) => (
                  <div key={s.id_mahasiswa} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center text-center hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
                    <div className="relative mb-3">
                      <div className={`w-14 h-14 rounded-full ${RANK_COLORS[i] ?? "bg-blue-200"} flex items-center justify-center text-white font-bold text-lg`}>
                        {s.nama_mahasiswa.charAt(0)}
                      </div>
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-700 dark:bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                        #{i + 1}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.nama_mahasiswa}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{s.angkatan ?? "-"}</p>
                    <span className="text-xs font-bold text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-950/50 px-2.5 py-1 rounded-full">
                      {s.persen_kehadiran}% Hadir
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-transparent dark:border-slate-800">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tren Kehadiran (14 Hari Terakhir)</h2>
              </div>

              {trenHarian.length < 2 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-16">Belum cukup data absensi untuk menampilkan tren.</p>
              ) : (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full h-52">
                  {[0, 25, 50, 75, 100].map((g) => (
                    <line
                      key={g}
                      x1={0}
                      x2={chartWidth}
                      y1={chartHeight - (g / 100) * chartHeight}
                      y2={chartHeight - (g / 100) * chartHeight}
                      stroke="currentColor"
                      strokeWidth={1}
                      className="text-slate-200 dark:text-slate-800"
                    />
                  ))}

                  <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={3} />

                  {trenHarian.map((d, i) => {
                    const x = (chartWidth / (trenHarian.length - 1)) * i;
                    const y = chartHeight - (d.persen_hadir / 100) * chartHeight;
                    const isHover = hoverIndex === i;
                    return (
                      <g key={d.tanggal} onMouseEnter={() => setHoverIndex(i)}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHover ? 6 : 4}
                          fill={isHover ? "#2563eb" : "currentColor"}
                          className={isHover ? "" : "text-white dark:text-slate-900"}
                          stroke="#2563eb"
                          strokeWidth={2}
                        />
                        {isHover && (
                          <>
                            <line x1={x} x2={x} y1={0} y2={chartHeight} stroke="#bfdbfe" strokeWidth={2} strokeDasharray="4 4" />
                            <rect x={x - 18} y={y - 32} width={36} height={20} rx={6} fill="#2563eb" />
                            <text x={x} y={y - 18} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                              {d.persen_hadir}%
                            </text>
                          </>
                        )}
                        <text
                          x={x}
                          y={chartHeight + 20}
                          textAnchor="middle"
                          fill="currentColor"
                          className="text-slate-400 dark:text-slate-500"
                          fontSize="10"
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-transparent dark:border-slate-800">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Kehadiran per Mata Kuliah</h2>
              </div>

              {kehadiranMatkul.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-16">Belum ada jadwal dengan data absensi.</p>
              ) : (
                <>
                  <div className="flex items-end gap-3 h-44">
                    {kehadiranMatkul.map((d) => {
                      const isMax = d.persen_hadir === matkulMax;
                      return (
                        <div key={d.id_jadwal} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          {isMax && <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{d.persen_hadir}%</span>}
                          <div
                            className={`w-full rounded-md ${isMax ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"}`}
                            style={{ height: `${Math.max(d.persen_hadir, 2)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-3">
                    {kehadiranMatkul.map((d) => (
                      <span key={d.id_jadwal} className="text-[10px] text-slate-400 dark:text-slate-500 flex-1 text-center truncate px-0.5">{d.nama_mata_kuliah}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 