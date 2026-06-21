"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  ClipboardList, Settings, LogOut, GraduationCap,
  Search, Bell, Maximize, ChevronDown, Plus, Eye, X, Copy, Check
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

interface KelasItem {
  id: number;
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  kode_gabung: string;
  total_mahasiswa: number;
}

interface AnggotaItem {
  id_anggota: number;
  id_mahasiswa: string;
  nama_mahasiswa: string;
  email: string | null;
  angkatan: string | null;
  status: "pending" | "approved" | "rejected";
  bergabung_pada: string;
}

const avatarColors = ["bg-blue-400", "bg-purple-400", "bg-pink-400", "bg-emerald-400", "bg-orange-400"];
function colorFor(id: string) {
  let sum = 0;
  for (const c of id) sum += c.charCodeAt(0);
  return avatarColors[sum % avatarColors.length];
}

export default function DosenMahasiswaPage() {
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [formNama, setFormNama] = useState("");
  const [formPelajaran, setFormPelajaran] = useState("");
  const [formLokasi, setFormLokasi] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [kodeBerhasil, setKodeBerhasil] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [anggotaList, setAnggotaList] = useState<AnggotaItem[]>([]);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"semua" | "pending" | "approved">("semua");

  function muatKelas() {
    setLoadingKelas(true);
    fetch(`http://localhost:8000/kelas?id_dosen=${DOSEN_ID}`)
      .then((r) => r.json())
      .then((data) => setKelasList(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingKelas(false));
  }

  useEffect(() => {
    muatKelas();
  }, []);

  function muatAnggota(kelas: KelasItem) {
    setSelectedKelas(kelas);
    setLoadingAnggota(true);
    setFilterStatus("semua");
    fetch(`http://localhost:8000/kelas/${kelas.id}/anggota`)
      .then((r) => r.json())
      .then((data) => setAnggotaList(data.data ?? []))
      .catch(() => setAnggotaList([]))
      .finally(() => setLoadingAnggota(false));
  }

  async function submitKelas(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formNama) {
      setFormError("Nama kelas wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formNama,
          pelajaran: formPelajaran || null,
          lokasi: formLokasi || null,
          id_dosen: DOSEN_ID,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setFormError(data.pesan ?? "Gagal membuat kelas");
        return;
      }

      setKodeBerhasil(data.data.kode_gabung);
      setFormNama("");
      setFormPelajaran("");
      setFormLokasi("");
      muatKelas();
    } catch {
      setFormError("Tidak dapat terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  async function approveAnggota(idAnggota: number) {
    await fetch(`http://localhost:8000/kelas/anggota/${idAnggota}/approve`, { method: "PUT" });
    if (selectedKelas) muatAnggota(selectedKelas);
    muatKelas();
  }

  async function kickAnggota(idAnggota: number) {
    if (!confirm("Keluarkan mahasiswa ini dari kelas?")) return;
    await fetch(`http://localhost:8000/kelas/anggota/${idAnggota}`, { method: "DELETE" });
    if (selectedKelas) muatAnggota(selectedKelas);
    muatKelas();
  }

  async function hapusKelas(id: number) {
    if (!confirm("Hapus kelas ini beserta semua anggotanya?")) return;
    await fetch(`http://localhost:8000/kelas/${id}`, { method: "DELETE" });
    muatKelas();
  }

  function copyKode(kode: string) {
    navigator.clipboard.writeText(kode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const filteredKelas = kelasList.filter((k) => k.nama.toLowerCase().includes(search.toLowerCase()));
  const filteredAnggota = anggotaList.filter((a) => filterStatus === "semua" || a.status === filterStatus);

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
          <p className="text-xs text-slate-400 mb-4">Class List /</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-2xl font-bold text-slate-800">{kelasList.length}</p>
              <p className="text-xs text-slate-500 mt-1">Total Kelas</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-2xl font-bold text-green-600">
                {kelasList.reduce((sum, k) => sum + k.total_mahasiswa, 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total Mahasiswa Tergabung</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-2xl font-bold text-blue-600">
                {kelasList.length > 0 ? Math.round(kelasList.reduce((s, k) => s + k.total_mahasiswa, 0) / kelasList.length) : 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Rata-rata Mahasiswa / Kelas</p>
            </div>
          </div>

          {/* Class List */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <h2 className="font-semibold text-slate-800">Class List</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari kelas..."
                    className="border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-sm outline-none w-44"
                  />
                </div>
                <button
                  onClick={() => { setShowAddModal(true); setKodeBerhasil(null); setFormError(""); }}
                  className="flex items-center gap-1 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  <Plus size={14} /> Add Class
                </button>
              </div>
            </div>

            {loadingKelas && <p className="text-sm text-slate-400 text-center py-10">Memuat data...</p>}

            {!loadingKelas && filteredKelas.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">
                Belum ada kelas. Klik &quot;Add Class&quot; untuk membuat kelas baru.
              </p>
            )}

            <div className="grid grid-cols-3 gap-5">
              {filteredKelas.map((kelas) => (
                <div key={kelas.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-900 relative flex items-center justify-center text-white">
                    <GraduationCap size={36} className="opacity-30" />
                    <span className="absolute top-3 right-3 bg-white/20 text-xs font-bold px-2.5 py-1 rounded-full">
                      {kelas.kode_gabung}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{kelas.nama}</p>
                        <p className="text-sm text-slate-500">{kelas.pelajaran || "-"}</p>
                        <p className="text-xs text-slate-400 mt-2">Location</p>
                        <p className="text-sm font-semibold text-slate-700">{kelas.lokasi || "-"}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-2">{kelas.total_mahasiswa} mahasiswa</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => muatAnggota(kelas)} className="text-blue-500 hover:text-blue-700">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => hapusKelas(kelas.id)} className="text-red-400 hover:text-red-600">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Class */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-96">
            {!kodeBerhasil ? (
              <form onSubmit={submitKelas}>
                <h2 className="text-center font-bold text-slate-800 text-lg mb-6">Make a New Class</h2>
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <label className="text-xs text-slate-400 block mb-1">Class Name</label>
                    <input
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="IF 4A Pagi"
                      className="w-full outline-none text-sm text-slate-700"
                    />
                  </div>
                  <div className="border-b border-slate-200 pb-3">
                    <label className="text-xs text-slate-400 block mb-1">Mata Pelajaran</label>
                    <input
                      value={formPelajaran}
                      onChange={(e) => setFormPelajaran(e.target.value)}
                      placeholder="Informatics"
                      className="w-full outline-none text-sm text-slate-700"
                    />
                  </div>
                  <div className="border-b border-slate-200 pb-3">
                    <label className="text-xs text-slate-400 block mb-1">Lokasi</label>
                    <input
                      value={formLokasi}
                      onChange={(e) => setFormLokasi(e.target.value)}
                      placeholder="TA lt 11.3"
                      className="w-full outline-none text-sm text-slate-700"
                    />
                  </div>

                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                      {formError}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-semibold">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-[#1a1f36] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                    {submitting ? "Menyimpan..." : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <h2 className="font-bold text-slate-800 text-lg mb-2">Kelas Berhasil Dibuat!</h2>
                <p className="text-sm text-slate-500 mb-5">Bagikan kode ini ke mahasiswa untuk bergabung ke kelas.</p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 flex items-center justify-center gap-3 mb-6">
                  <span className="text-2xl font-bold tracking-widest text-blue-600">{kodeBerhasil}</span>
                  <button onClick={() => copyKode(kodeBerhasil)} className="text-slate-400 hover:text-slate-600">
                    {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>

                <button
                  onClick={() => { setShowAddModal(false); setKodeBerhasil(null); }}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold"
                >
                  Selesai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detail Anggota Kelas */}
      {selectedKelas && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[640px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-slate-800 text-lg">Student In Class {selectedKelas.nama}</h2>
              <button onClick={() => setSelectedKelas(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Kode gabung: {selectedKelas.kode_gabung}</p>

            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 mb-4 w-fit">
              {(["semua", "pending", "approved"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                    filterStatus === f ? "bg-blue-600 text-white" : "text-slate-500"
                  }`}
                >
                  {f === "semua" ? "Semua" : f === "pending" ? "Menunggu Approval" : "Sudah Bergabung"}
                </button>
              ))}
            </div>

            {loadingAnggota && <p className="text-sm text-slate-400 text-center py-10">Memuat data...</p>}

            {!loadingAnggota && filteredAnggota.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">Belum ada mahasiswa di kategori ini.</p>
            )}

            <div className="space-y-3">
              {filteredAnggota.map((a) => (
                <div key={a.id_anggota} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${colorFor(a.id_mahasiswa)} flex items-center justify-center text-white font-bold text-sm`}>
                      {a.nama_mahasiswa.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.nama_mahasiswa}</p>
                      <p className="text-xs text-slate-400">{a.id_mahasiswa} • {a.angkatan ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      a.status === "approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                    }`}>
                      {a.status === "approved" ? "Bergabung" : "Menunggu"}
                    </span>

                    {a.status === "pending" && (
                      <button
                        onClick={() => approveAnggota(a.id_anggota)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                      >
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => kickAnggota(a.id_anggota)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                    >
                      Kick
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}