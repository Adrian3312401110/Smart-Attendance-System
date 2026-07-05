"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Maximize, ChevronDown, Plus, Pencil, Trash2, BookOpen, X, Eye, Users, Clock, CalendarDays
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface MataKuliahItem {
  id_mata_kuliah: string;
  nama: string;
  sks: number | null;
}

interface KelasPerMatkul {
  id_jadwal: number;
  id_kelas: number | null;
  nama_kelas: string;
  kode_gabung: string | null;
  nama_dosen: string;
  hari: string;
  jam: string;
  aktif: boolean;
  total_mahasiswa: number;
  total_pending: number;
}

const cardColors = [
  "from-blue-600 to-blue-900",
  "from-purple-600 to-purple-900",
  "from-emerald-600 to-emerald-900",
  "from-orange-500 to-orange-800",
  "from-pink-600 to-pink-900",
];
function colorFor(id: string) {
  let sum = 0;
  for (const c of id) sum += c.charCodeAt(0);
  return cardColors[sum % cardColors.length];
}

export default function DosenMatkulPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [matkul, setMatkul] = useState<MataKuliahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [formKode, setFormKode] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formSks, setFormSks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editKode, setEditKode] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editSks, setEditSks] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [selectedMatkul, setSelectedMatkul] = useState<MataKuliahItem | null>(null);
  const [kelasPerMatkul, setKelasPerMatkul] = useState<KelasPerMatkul[]>([]);
  const [loadingKelasMatkul, setLoadingKelasMatkul] = useState(false);

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
    loadMatkul();
    fetch(`http://localhost:8000/dosen/${authUser.id}`)
      .then((r) => r.json())
      .then((data) => setFotoUrl(data?.foto_url ?? null))
      .catch(() => {});
  }, [authUser]);

  async function loadMatkul() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/mata-kuliah");
      const data = await res.json();
      setMatkul(data.data ?? []);
    } catch {
      setMatkul([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitTambah(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formKode.trim() || !formNama.trim()) {
      setFormError("Kode dan nama mata kuliah wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/mata-kuliah", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id_mata_kuliah: formKode.trim(),
          nama: formNama.trim(),
          sks: formSks.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.berhasil === false) {
        setFormError(data.pesan ?? "Gagal menambahkan mata kuliah");
        return;
      }

      setShowAddModal(false);
      setFormKode("");
      setFormNama("");
      setFormSks("");
      loadMatkul();
    } catch {
      setFormError("Tidak dapat terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  function bukaEdit(item: MataKuliahItem) {
    setEditKode(item.id_mata_kuliah);
    setEditNama(item.nama);
    setEditSks(item.sks !== null ? String(item.sks) : "");
    setEditError("");
    setShowEditModal(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");

    if (!editNama.trim()) {
      setEditError("Nama mata kuliah wajib diisi");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/mata-kuliah/${editKode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          nama: editNama.trim(),
          sks: editSks.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.berhasil === false) {
        setEditError(data.pesan ?? "Gagal memperbarui mata kuliah");
        return;
      }

      setShowEditModal(false);
      loadMatkul();
    } catch {
      setEditError("Tidak dapat terhubung ke server");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function hapusMatkul(item: MataKuliahItem) {
    if (!confirm(`Hapus mata kuliah "${item.nama}"? Tidak bisa dihapus kalau masih dipakai di jadwal kelas.`)) return;
    try {
      const res = await fetch(`http://localhost:8000/mata-kuliah/${item.id_mata_kuliah}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.berhasil === false) {
        alert(data.pesan ?? "Gagal menghapus mata kuliah");
        return;
      }
      loadMatkul();
    } catch {
      alert("Tidak dapat terhubung ke server");
    }
  }

  function bukaLihatKelas(item: MataKuliahItem) {
    setSelectedMatkul(item);
    setLoadingKelasMatkul(true);
    fetch(`http://localhost:8000/mata-kuliah/${item.id_mata_kuliah}/kelas?id_dosen=${authUser?.id ?? ""}`)
      .then((r) => r.json())
      .then((data) => setKelasPerMatkul(data.data ?? []))
      .catch(() => setKelasPerMatkul([]))
      .finally(() => setLoadingKelasMatkul(false));
  }

  const filtered = matkul.filter(
    (m) =>
      m.nama.toLowerCase().includes(search.toLowerCase()) ||
      m.id_mata_kuliah.toLowerCase().includes(search.toLowerCase())
  );

  const totalSks = matkul.reduce((sum, m) => sum + (m.sks ?? 0), 0);
  const rataSks = matkul.length > 0 ? Math.round((totalSks / matkul.length) * 10) / 10 : 0;
  const userInitials = (authUser?.name ?? "D")
    .split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

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
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Course List /</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{matkul.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Mata Kuliah</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSks}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total SKS</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{rataSks}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Rata-rata SKS / Mata Kuliah</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Daftar Mata Kuliah</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari mata kuliah..."
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg pl-8 pr-4 py-1.5 text-sm outline-none w-44"
                  />
                </div>
                <button
                  onClick={() => { setShowAddModal(true); setFormError(""); }}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Tambah Mata Kuliah
                </button>
              </div>
            </div>

            {loading && <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Memuat data...</p>}

            {!loading && filtered.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">
                Belum ada mata kuliah. Klik &quot;Tambah Mata Kuliah&quot; untuk membuat yang baru.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => (
                <div key={item.id_mata_kuliah} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
                  <div className={`h-24 bg-gradient-to-br ${colorFor(item.id_mata_kuliah)} relative flex items-center justify-center text-white`}>
                    <BookOpen size={32} className="opacity-30" />
                    <span className="absolute top-3 right-3 bg-white/20 text-xs font-bold px-2.5 py-1 rounded-full">
                      {item.id_mata_kuliah}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.nama}</p>
                        <span className="inline-block mt-2 text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full">
                          {item.sks ?? 0} SKS
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => bukaLihatKelas(item)}
                          title="Lihat kelas yang memakai mata kuliah ini"
                          className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold"
                        >
                          <Eye size={15} /> Lihat Kelas
                        </button>
                        <button
                          onClick={() => bukaEdit(item)}
                          title="Edit mata kuliah"
                          className="flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-semibold"
                        >
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          onClick={() => hapusMatkul(item)}
                          title="Hapus mata kuliah"
                          className="flex items-center gap-1 text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs font-semibold"
                        >
                          <Trash2 size={15} /> Hapus
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={submitTambah} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-96 border border-transparent dark:border-slate-800 relative">
            <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h2 className="text-center font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">Tambah Mata Kuliah</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Kode Mata Kuliah</label>
                <input
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value)}
                  placeholder="TI001"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Nama Mata Kuliah</label>
                <input
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Pemrograman Web"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">SKS</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formSks}
                  onChange={(e) => setFormSks(e.target.value)}
                  placeholder="3"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)}
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Batal
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-[#1a1f36] dark:bg-blue-700 hover:bg-[#242b4a] dark:hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                {submitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form onSubmit={submitEdit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-96 border border-transparent dark:border-slate-800 relative">
            <button type="button" onClick={() => setShowEditModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h2 className="text-center font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">Edit Mata Kuliah</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Kode Mata Kuliah</label>
                <input
                  value={editKode}
                  disabled
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg px-3 py-2.5 text-sm outline-none cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Kode tidak bisa diubah karena sudah dipakai di jadwal.</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Nama Mata Kuliah</label>
                <input
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">SKS</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editSks}
                  onChange={(e) => setEditSks(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editError && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs rounded-lg px-3 py-2">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowEditModal(false)}
                className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Batal
              </button>
              <button type="submit" disabled={editSubmitting}
                className="flex-1 bg-[#1a1f36] dark:bg-blue-700 hover:bg-[#242b4a] dark:hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                {editSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      )}
      {selectedMatkul && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-[640px] max-h-[80vh] overflow-y-auto border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Kelas untuk {selectedMatkul.nama}</h2>
              <button
                onClick={() => setSelectedMatkul(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
                title="Tutup"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Kode: {selectedMatkul.id_mata_kuliah}</p>

            {loadingKelasMatkul && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Memuat data...</p>
            )}

            {!loadingKelasMatkul && kelasPerMatkul.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">
                Belum ada kelas yang memakai mata kuliah ini di jadwal Anda.
              </p>
            )}

            <div className="space-y-3">
              {kelasPerMatkul.map((k) => (
                <div key={k.id_jadwal} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{k.nama_kelas}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <CalendarDays size={12} /> {k.hari} • {k.jam}
                      </p>
                      {k.kode_gabung && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Kode gabung: {k.kode_gabung}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      k.aktif
                        ? "bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}>
                      {k.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 px-2.5 py-1 rounded-full">
                      <Users size={12} /> {k.total_mahasiswa} bergabung
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      k.total_pending > 0
                        ? "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                    }`}>
                      <Clock size={12} /> {k.total_pending} menunggu approval
                    </span>
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