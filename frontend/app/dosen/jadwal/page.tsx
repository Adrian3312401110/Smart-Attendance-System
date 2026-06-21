"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  ClipboardList, Settings, LogOut, GraduationCap,
  Search, Bell, Maximize, ChevronDown, Sun,
  Plus, Trash2, SlidersHorizontal
} from "lucide-react";

const DOSEN_ID = "109057"; // TODO: ganti dengan id dosen dari sesi login

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

interface JadwalDetail {
  id: number;
  id_dosen: string;
  nama_dosen: string;
  id_mata_kuliah: string;
  nama_mata_kuliah: string;
  hari: string;
  jam: string;
}

interface MataKuliahItem {
  id_mata_kuliah: string;
  nama: string;
  sks: number | null;
}

const absensiData = [
  { id: "2341421", name: "Ahmed Rashdan", role: "Help Desk Executive", dept: "IT Department", date: "29 July 2023", status: "Work from office", checkin: "09:00", checkout: "18:00", hours: "10h 2m" },
  { id: "3411421", name: "Ali Alhamdan", role: "Senior Executive", dept: "Marketing", date: "28 July 2023", status: "Absent", checkin: "00:00", checkout: "00:00", hours: "0m" },
];

function statusStyle(status: string) {
  if (status === "Absent") return "bg-red-100 text-red-600";
  if (status === "Late arrival") return "bg-yellow-100 text-yellow-600";
  if (status === "Work from home") return "bg-blue-100 text-blue-600";
  return "bg-green-100 text-green-600";
}

export default function DosenJadwalPage() {
  const [time, setTime] = useState("");
  const [activeTab, setActiveTab] = useState<"jadwal" | "absensi">("jadwal");
  const [jadwalList, setJadwalList] = useState<JadwalDetail[]>([]);
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliahItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formMataKuliah, setFormMataKuliah] = useState("");
  const [formHari, setFormHari] = useState("Senin");
  const [formJam, setFormJam] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function muatJadwal() {
    setLoading(true);
    fetch("http://localhost:8000/jadwal/detail")
      .then((r) => r.json())
      .then((data) => setJadwalList(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

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
    muatJadwal();
    fetch("http://localhost:8000/mata-kuliah")
      .then((r) => r.json())
      .then((data) => setMataKuliahList(data.data ?? []))
      .catch(() => {});
  }, []);

  async function submitJadwal(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formMataKuliah || !formHari || !formJam) {
      setFormError("Semua field wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("id_dosen", DOSEN_ID);
      body.append("id_mata_kuliah", formMataKuliah);
      body.append("hari", formHari);
      body.append("jam", formJam);

      const res = await fetch("http://localhost:8000/jadwal", { method: "POST", body });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setFormError(data.pesan ?? "Gagal menambahkan jadwal");
        return;
      }

      setShowForm(false);
      setFormMataKuliah("");
      setFormJam("");
      muatJadwal();
    } catch {
      setFormError("Tidak dapat terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapusJadwal(id: number) {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      await fetch(`http://localhost:8000/jadwal/${id}`, { method: "DELETE" });
      muatJadwal();
    } catch {
      alert("Gagal menghapus jadwal");
    }
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const todayShort = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

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
          {/* Tab toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveTab("jadwal")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "jadwal" ? "bg-blue-600 text-white" : "bg-white text-slate-600 shadow-sm"}`}
            >
              Class Schedule
            </button>
            <button
              onClick={() => setActiveTab("absensi")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "absensi" ? "bg-blue-600 text-white" : "bg-white text-slate-600 shadow-sm"}`}
            >
              Attendance Overview
            </button>
          </div>

          {activeTab === "jadwal" && (
            <>
              <p className="text-xs text-slate-400 mb-4">Class List /</p>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
                    >
                      <Plus size={13} /> Add Schedule
                    </button>
                    <h2 className="font-semibold text-slate-800">Daftar Jadwal Kelas</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Today:</p>
                    <p className="text-xs font-semibold text-slate-700">{today}</p>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-3 px-3">No.</th>
                      <th className="pb-3 px-3">Hari</th>
                      <th className="pb-3 px-3">Jam</th>
                      <th className="pb-3 px-3">Mata Kuliah</th>
                      <th className="pb-3 px-3">Dosen</th>
                      <th className="pb-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400 text-sm">Memuat data...</td></tr>
                    )}

                    {!loading && jadwalList.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400 text-sm">Belum ada jadwal. Klik &quot;Add Schedule&quot; untuk menambahkan.</td></tr>
                    )}

                    {jadwalList.map((row, i) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-4 px-3">
                          <div className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-600">
                            {i + 1}
                          </div>
                        </td>
                        <td className="py-4 px-3 text-sm text-slate-700">{row.hari}</td>
                        <td className="py-4 px-3 text-sm text-slate-700">{row.jam}</td>
                        <td className="py-4 px-3 text-sm font-medium text-slate-800">{row.nama_mata_kuliah}</td>
                        <td className="py-4 px-3 text-sm text-slate-500">{row.nama_dosen}</td>
                        <td className="py-4 px-3">
                          <button onClick={() => hapusJadwal(row.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "absensi" && (
            <>
              <p className="text-xs text-slate-400 mb-4">Schedule Class /</p>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-semibold text-slate-800 text-lg">Attendance Overview</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input placeholder="Quick Search..." className="border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-sm outline-none w-44" />
                    </div>
                    <button className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600">
                      <Calendar size={13} /> 29 July 2023
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium">
                      <SlidersHorizontal size={13} /> Advanced Filters
                    </button>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="pb-3 px-3">ID</th>
                      <th className="pb-3 px-3">Employee</th>
                      <th className="pb-3 px-3">Role</th>
                      <th className="pb-3 px-3">Department</th>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Check-in</th>
                      <th className="pb-3 px-3">Check-out</th>
                      <th className="pb-3 px-3">Work hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absensiData.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-3 text-sm text-slate-500">{row.id}</td>
                        <td className="py-3 px-3 text-sm font-medium text-slate-800">{row.name}</td>
                        <td className="py-3 px-3 text-sm text-slate-500">{row.role}</td>
                        <td className="py-3 px-3 text-sm text-slate-500">{row.dept}</td>
                        <td className="py-3 px-3 text-sm text-slate-500">{row.date}</td>
                        <td className="py-3 px-3">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${statusStyle(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">{row.checkin}</td>
                        <td className="py-3 px-3 text-sm text-slate-600">
                          <span className="text-slate-300 mx-1">······</span> {row.checkout}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">{row.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="text-xs text-slate-400 mt-4">
                  Tampilan kehadiran lengkap dengan filter jadwal tersedia di halaman Attendance Overview (menu sidebar).
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Add Schedule */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={submitJadwal} className="bg-white rounded-2xl shadow-2xl p-8 w-96">
            <h2 className="text-center font-bold text-slate-800 text-lg mb-6">Tambah Jadwal Kelas</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mata Kuliah</label>
                <select
                  value={formMataKuliah}
                  onChange={(e) => setFormMataKuliah(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih mata kuliah --</option>
                  {mataKuliahList.map((mk) => (
                    <option key={mk.id_mata_kuliah} value={mk.id_mata_kuliah}>
                      {mk.nama} ({mk.id_mata_kuliah})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Hari</label>
                <select
                  value={formHari}
                  onChange={(e) => setFormHari(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Jam</label>
                <input
                  type="text"
                  value={formJam}
                  onChange={(e) => setFormJam(e.target.value)}
                  placeholder="08:00 - 09:40"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#1a1f36] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}