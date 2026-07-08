"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Maximize, ChevronDown, Sun,
  Clock, UserX, Eye, Hourglass, Moon, UserMinus, Users
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

interface MahasiswaItem {
  id_mahasiswa: string;
  nama_mahasiswa: string;
  email: string | null;
  angkatan: string | null;
  dibuat_pada: string | null;
}

export default function DosenDashboardPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [ringkasan, setRingkasan] = useState<RingkasanAbsensi | null>(null);
  const [mahasiswaBaru, setMahasiswaBaru] = useState<MahasiswaItem[]>([]);
  const [loading, setLoading] = useState(true);

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

    setLoading(true);
    Promise.all([
      fetch(`http://localhost:8000/dosen/${authUser.id}/ringkasan-absensi`).then((r) => r.json()),
      fetch("http://localhost:8000/mahasiswa").then((r) => r.json()),
      fetch(`http://localhost:8000/dosen/${authUser.id}`).then((r) => r.json()),
    ])
      .then(([ringkasanRes, mahasiswaRes, dosenRes]) => {
        setRingkasan(ringkasanRes);
        setMahasiswaBaru((mahasiswaRes.data ?? []).slice(0, 6));
        setFotoUrl(dosenRes?.foto_url ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser]);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const stats1 = [
    { label: "Total Mahasiswa", value: ringkasan?.total_mahasiswa ?? 0, icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300", desc: "Tergabung di kelas Anda" },
    { label: "Total Hadir", value: ringkasan?.total_hadir ?? 0, icon: Clock, color: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300", desc: "Sepanjang waktu" },
    { label: "Tidak Hadir", value: ringkasan?.total_tidak_hadir ?? 0, icon: UserX, color: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300", desc: "Sepanjang waktu" },
    { label: "Total Absensi", value: ringkasan?.total_absensi ?? 0, icon: Eye, color: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300", desc: `${ringkasan?.total_jadwal ?? 0} jadwal aktif` },
  ];

  const stats2 = [
    { label: "Hadir Hari Ini", value: ringkasan?.hari_ini_hadir ?? 0, icon: Hourglass, color: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300" },
    { label: "Terlambat Hari Ini", value: ringkasan?.hari_ini_terlambat ?? 0, icon: Moon, color: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300" },
    { label: "Tidak Hadir Hari Ini", value: ringkasan?.hari_ini_tidak_hadir ?? 0, icon: UserMinus, color: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300" },
  ];

  const userInitials = (authUser?.name ?? "D")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <SidebarNav role="dosen" />

      <div className="flex-1 flex flex-col">
        <div className="bg-blue-700 dark:bg-blue-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span className="text-white font-semibold text-base">Smart Attendance System</span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                placeholder="Quick Search..."
                className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full pl-8 pr-4 py-1.5 outline-none w-48"
              />
            </div>
            <Bell size={16} className="text-white cursor-pointer" />
            <Maximize size={16} className="text-white cursor-pointer" />

            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : userInitials}
                </div>
                <div className="text-left">
                  <p className="text-white text-xs font-medium">{authUser?.name ?? "Dosen"}</p>
                  <p className="text-white/70 text-[11px]">{authUser?.email ?? "-"}</p>
                </div>
                <ChevronDown size={12} className="text-white" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl p-5 z-50 border border-slate-100 dark:border-slate-700">
                  <div className="w-14 h-14 rounded-full bg-blue-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2 overflow-hidden">
                    {fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : userInitials}
                  </div>
                  <p className="text-center font-semibold text-slate-800 dark:text-slate-100">{authUser?.name ?? "-"}</p>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4">Dosen</p>
                  {[
                    { label: "Full Name", value: authUser?.name ?? "-" },
                    { label: "ID Dosen", value: authUser?.id ?? "-" },
                    { label: "Email", value: authUser?.email ?? "-" },
                  ].map((f) => (
                    <div key={f.label} className="mb-3">
                      <label className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">{f.label}</label>
                      <input
                        defaultValue={f.value}
                        readOnly
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Dashboard /</p>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lecture Dashboard</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Selamat datang kembali, {authUser?.name ?? "Dosen"}.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="bg-blue-700 dark:bg-blue-800 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sun size={18} />
                <span className="text-xl font-bold">{time}</span>
              </div>
              <p className="text-xs text-blue-200">Today:</p>
              <p className="text-sm font-medium">{today}</p>
            </div>

            {stats1.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-transparent dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loading ? "-" : s.value}</p>
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
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loading ? "-" : s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Mahasiswa Terbaru Terdaftar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 px-3">No.</th>
                    <th className="pb-3 px-3">Nama</th>
                    <th className="pb-3 px-3">ID Mahasiswa</th>
                    <th className="pb-3 px-3">Email</th>
                    <th className="pb-3 px-3">Angkatan</th>
                    <th className="pb-3 px-3">Tanggal Daftar</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Memuat data...</td></tr>
                  )}
                  {!loading && mahasiswaBaru.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Belum ada mahasiswa terdaftar.</td></tr>
                  )}
                  {mahasiswaBaru.map((m, i) => (
                    <tr key={m.id_mahasiswa} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3">
                        <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {i + 1}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">
                          {m.nama_mahasiswa.charAt(0)}
                        </div>
                        {m.nama_mahasiswa}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.id_mahasiswa}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.email ?? "-"}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">{m.angkatan ?? "-"}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">
                        {m.dibuat_pada ? new Date(m.dibuat_pada).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
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