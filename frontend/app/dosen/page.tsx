"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  ClipboardList, Settings, LogOut, GraduationCap,
  Search, Bell, Maximize, ChevronDown, Sun,
  Clock, UserX, Eye, Hourglass, Moon, UserMinus, Plus
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
      <div className="text-white mb-2">
        <GraduationCap size={24} />
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-blue-600 hover:text-white"
            }`}
          >
            <item.icon size={18} />
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 items-center">
        <Link href="/dosen/settings" className="text-slate-400 hover:text-white">
          <Settings size={18} />
        </Link>
        <Link href="/login" className="text-slate-400 hover:text-red-400">
          <LogOut size={18} />
        </Link>
      </div>
    </aside>
  );
}

interface MahasiswaData {
  total: number;
  data: { id_mahasiswa: string; nama_mahasiswa: string; angkatan: string }[];
}

export default function DosenDashboardPage() {
  const [time, setTime] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [mahasiswa, setMahasiswa] = useState<MahasiswaData | null>(null);

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
    fetch("http://localhost:8000/mahasiswa")
      .then((r) => r.json())
      .then(setMahasiswa)
      .catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const stats1 = [
    { label: "Total Student", value: mahasiswa?.total ?? 0, icon: Users, color: "bg-blue-100 text-blue-600", change: "+2 new student added!", up: true },
    { label: "On Time", value: 360, icon: Clock, color: "bg-green-100 text-green-600", change: "-10% Less than yesterday", up: false },
    { label: "Alfa", value: 30, icon: UserX, color: "bg-orange-100 text-orange-600", change: "+3% increase than yesterday", up: false },
    { label: "Total Absensi", value: 432, icon: Eye, color: "bg-purple-100 text-purple-600", change: "+1% than yesterday", up: true },
  ];

  const stats2 = [
    { label: "Late", value: 62, icon: Hourglass, color: "bg-orange-100 text-orange-600", change: "+3% Increase than yesterday", up: false },
    { label: "Early", value: 6, icon: Moon, color: "bg-blue-100 text-blue-600", change: "-10% Less than yesterday", up: true },
    { label: "Absent", value: 42, icon: UserMinus, color: "bg-purple-100 text-purple-600", change: "+2% increase than yesterday", up: false },
  ];

  const students = mahasiswa?.data?.map((m) => ({
    id: m.id_mahasiswa,
    name: m.nama_mahasiswa,
    prodi: "Teknik Informatika",
    kelas: "IF 4A Pagi",
    tahun: m.angkatan ?? "-",
  })) ?? [];

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
                <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm">D</div>
                <div className="text-left">
                  <p className="text-white text-xs font-medium">Dosen</p>
                  <p className="text-white/70 text-[11px]">dosen@polibatam.ac.id</p>
                </div>
                <ChevronDown size={12} className="text-white" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl p-5 z-50">
                  <div className="w-14 h-14 rounded-full bg-blue-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">D</div>
                  <p className="text-center font-semibold text-slate-800">Mir&apos;atul Khusna Mufida</p>
                  <p className="text-center text-xs text-slate-500 mb-4">Dosen Wali</p>
                  {[
                    { label: "Full Name", value: "Mir'atul Khusna Mufida" },
                    { label: "NIP", value: "109057" },
                    { label: "Email", value: "dosen@polibatam.ac.id" },
                  ].map((f) => (
                    <div key={f.label} className="mb-3">
                      <label className="text-[11px] text-slate-400 block mb-1">{f.label}</label>
                      <input defaultValue={f.value} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none" />
                    </div>
                  ))}
                  <button className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 mb-1">Dashboard /</p>
          <h1 className="text-lg font-semibold text-slate-800">Lecture Dashboard</h1>
          <p className="text-xs text-slate-400 mb-5">Welcome back, here are all attendance report for today.</p>

          {/* Stats Row 1 */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="bg-blue-700 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sun size={18} />
                <span className="text-xl font-bold">{time}</span>
              </div>
              <p className="text-xs text-blue-200">Today:</p>
              <p className="text-sm font-medium">{today}</p>
              <button className="mt-3 text-xs bg-white/20 rounded-lg px-3 py-1.5 hover:bg-white/30 w-full text-left">
                ⚙ Advanced Configuration
              </button>
            </div>

            {stats1.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className={`text-xs ${s.up ? "text-green-600" : "text-red-500"}`}>
                  {s.up ? "▲" : "▼"} {s.change}
                </p>
              </div>
            ))}
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats2.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className={`text-xs ${s.up ? "text-green-600" : "text-red-500"}`}>
                  {s.up ? "▲" : "▼"} {s.change}
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-slate-800">New Student</h2>
              <input
                placeholder="Search student..."
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none w-48"
              />
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-3 px-3">No.</th>
                  <th className="pb-3 px-3">Photo</th>
                  <th className="pb-3 px-3">Name</th>
                  <th className="pb-3 px-3">Academic Program</th>
                  <th className="pb-3 px-3">Class</th>
                  <th className="pb-3 px-3">Date of Joining</th>
                  <th className="pb-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-semibold">
                        {i + 1}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {m.name.charAt(0)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700 font-medium">{m.name}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.prodi}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{m.kelas}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">2nd April {m.tahun}</td>
                    <td className="py-3 px-3">
                      <button className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg">
                        <Plus size={12} /> Add to the group
                      </button>
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