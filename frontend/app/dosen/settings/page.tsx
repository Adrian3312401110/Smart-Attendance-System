"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  ClipboardList, Settings, LogOut, GraduationCap,
  Search, Bell, Maximize, ChevronDown, Camera, Lock
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
        <Link href="/dosen/settings" className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          pathname === "/dosen/settings" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-blue-600 hover:text-white"
        }`}>
          <Settings size={18} />
        </Link>
        <Link href="/login" className="text-slate-400 hover:text-red-400"><LogOut size={18} /></Link>
      </div>
    </aside>
  );
}

export default function DosenSettingsPage() {
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/dosen/${DOSEN_ID}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.nama_dosen) {
          setNamaLengkap(data.nama_dosen);
          setEmail(data.email ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function simpanPerubahan() {
    setMessage(null);
    if (!namaLengkap.trim()) {
      setMessage({ type: "error", text: "Nama tidak boleh kosong" });
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.append("nama_dosen", namaLengkap);
      body.append("email", email);

      const res = await fetch(`http://localhost:8000/dosen/${DOSEN_ID}`, {
        method: "PUT",
        body,
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setMessage({ type: "error", text: data.pesan ?? "Gagal menyimpan perubahan" });
        return;
      }

      setMessage({ type: "success", text: "Profil berhasil diperbarui" });
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server" });
    } finally {
      setSaving(false);
    }
  }

  const [firstName, ...rest] = namaLengkap.split(" ");
  const lastName = rest.join(" ");

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
          <p className="text-xs text-slate-400 mb-4">Setting /</p>

          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-slate-800 text-base">Personal Profile</h2>
              <button
                onClick={simpanPerubahan}
                disabled={saving || loading}
                className="bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Save Changes"}
              </button>
            </div>

            {/* Tab */}
            <div className="mb-6">
              <button className="border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg">
                Main Info
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Memuat data...</p>
            ) : (
              <>
                {/* Avatar */}
                <div className="relative w-24 h-24 mb-6">
                  <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    <svg viewBox="0 0 24 24" className="w-16 h-16 text-slate-400" fill="currentColor">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white hover:bg-slate-700">
                    <Camera size={14} />
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-5 max-w-sm">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">First Name</label>
                    <input
                      value={firstName ?? ""}
                      onChange={(e) => setNamaLengkap(`${e.target.value} ${lastName}`.trim())}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Last Name</label>
                    <input
                      value={lastName ?? ""}
                      onChange={(e) => setNamaLengkap(`${firstName} ${e.target.value}`.trim())}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {message && (
                    <div
                      className={`rounded-lg px-4 py-3 text-xs ${
                        message.type === "success"
                          ? "bg-green-50 border border-green-200 text-green-700"
                          : "bg-red-50 border border-red-200 text-red-600"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {/* Privacy notice */}
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                    <Lock size={15} className="text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-slate-600">
                      We keep your data private and never share it with third-parties.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}