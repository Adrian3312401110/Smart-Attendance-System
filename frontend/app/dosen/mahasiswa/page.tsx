"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Eye, Trash2, Copy, Check, GraduationCap, Users, Clock, Pencil
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface KelasItem {
  id: number;
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  kode_gabung: string;
  total_mahasiswa: number;
  total_pending: number;
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
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
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

  // ===== Edit Kelas =====
  const [showEditModal, setShowEditModal] = useState(false);
  const [editKelasId, setEditKelasId] = useState<number | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editPelajaran, setEditPelajaran] = useState("");
  const [editLokasi, setEditLokasi] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [anggotaList, setAnggotaList] = useState<AnggotaItem[]>([]);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"semua" | "pending" | "approved">("semua");

  function muatKelas() {
    if (!authUser?.id) return;
    setLoadingKelas(true);
    fetch(`http://localhost:8000/kelas?id_dosen=${authUser.id}`)
      .then((r) => r.json())
      .then((data) => setKelasList(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingKelas(false));
  }

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
  if (authUser?.id) {
    muatKelas();
    fetch(`http://localhost:8000/dosen/${authUser.id}`)
      .then((r) => r.json())
      .then((data) => setFotoUrl(data?.foto_url ?? null))
      .catch(() => {});
  }
}, [authUser]);

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
      if (!authUser?.id) {
        setFormError("Sesi login tidak valid");
        return;
      }

      const res = await fetch("http://localhost:8000/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formNama,
          pelajaran: formPelajaran || null,
          lokasi: formLokasi || null,
          id_dosen: authUser.id,
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

  function bukaEditKelas(kelas: KelasItem) {
    setEditKelasId(kelas.id);
    setEditNama(kelas.nama);
    setEditPelajaran(kelas.pelajaran ?? "");
    setEditLokasi(kelas.lokasi ?? "");
    setEditError("");
    setShowEditModal(true);
  }

  function tutupEditKelas() {
    setShowEditModal(false);
    setEditKelasId(null);
    setEditError("");
  }

  async function submitEditKelas(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");

    if (!editNama.trim()) {
      setEditError("Nama kelas wajib diisi");
      return;
    }
    if (editKelasId === null) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/kelas/${editKelasId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editNama.trim(),
          pelajaran: editPelajaran || null,
          lokasi: editLokasi || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setEditError(data.pesan ?? "Gagal memperbarui kelas");
        return;
      }

      // Sinkronkan modal anggota kalau kelas yang sedang dibuka adalah yang baru diedit
      if (selectedKelas && selectedKelas.id === editKelasId) {
        setSelectedKelas({ ...selectedKelas, nama: data.data.nama, pelajaran: data.data.pelajaran, lokasi: data.data.lokasi });
      }

      tutupEditKelas();
      muatKelas();
    } catch {
      setEditError("Tidak dapat terhubung ke server");
    } finally {
      setEditSubmitting(false);
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
    if (!confirm("Hapus kelas ini beserta semua anggotanya? Tindakan ini tidak bisa dibatalkan.")) return;
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
  const totalPendingSemua = kelasList.reduce((sum, k) => sum + k.total_pending, 0);
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
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Daftar Kelas /</p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kelasList.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Kelas</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {kelasList.reduce((sum, k) => sum + k.total_mahasiswa, 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mahasiswa Sudah Bergabung</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{totalPendingSemua}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Menunggu Approval</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-transparent dark:border-slate-800">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {kelasList.length > 0 ? Math.round(kelasList.reduce((s, k) => s + k.total_mahasiswa, 0) / kelasList.length) : 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Rata-rata Mahasiswa / Kelas</p>
            </div>
          </div>

          {/* Daftar Kelas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Daftar Kelas</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari kelas..."
                    className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg pl-8 pr-4 py-1.5 text-sm outline-none w-44"
                  />
                </div>
                <button
                  onClick={() => { setShowAddModal(true); setKodeBerhasil(null); setFormError(""); }}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Buat Kelas Baru
                </button>
              </div>
            </div>

            {loadingKelas && <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Memuat data...</p>}

            {!loadingKelas && filteredKelas.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">
                Belum ada kelas. Klik &quot;Buat Kelas Baru&quot; untuk membuat kelas baru.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredKelas.map((kelas) => (
                <div key={kelas.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-900 dark:from-blue-700 dark:to-slate-900 relative flex items-center justify-center text-white">
                    <GraduationCap size={36} className="opacity-30" />
                    <span className="absolute top-3 right-3 bg-white/20 text-xs font-bold px-2.5 py-1 rounded-full">
                      {kelas.kode_gabung}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{kelas.nama}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{kelas.pelajaran || "-"}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Lokasi</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{kelas.lokasi || "-"}</p>

                        <div className="flex flex-col gap-2 mt-3 items-start">
                          <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 px-2.5 py-1 rounded-full">
                            <Users size={12} /> {kelas.total_mahasiswa} bergabung
                          </span>
                          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            kelas.total_pending > 0
                              ? "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                          }`}>
                            <Clock size={12} /> {kelas.total_pending} menunggu approval
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-2">
                        <button
                          onClick={() => muatAnggota(kelas)}
                          title="Lihat & kelola anggota kelas"
                          className="text-green-600 dark:text-green-300 hover:text-green-700 dark:hover:text-green-400 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye size={15} /> Anggota
                        </button>
                        <button
                          onClick={() => bukaEditKelas(kelas)}
                          title="Edit kelas ini"
                          className="flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-semibold"
                        >
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          onClick={() => hapusKelas(kelas.id)}
                          title="Hapus kelas ini"
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

      {/* Modal Add Class */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 w-[92vw] max-w-sm border border-transparent dark:border-slate-800">
            {!kodeBerhasil ? (
              <form onSubmit={submitKelas}>
                <h2 className="text-center font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">Buat Kelas Baru</h2>
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Nama Kelas</label>
                    <input
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="IF 4A Pagi"
                      className="w-full outline-none text-sm text-slate-700 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Prodi</label>
                    <input
                      value={formPelajaran}
                      onChange={(e) => setFormPelajaran(e.target.value)}
                      placeholder="Informatika"
                      className="w-full outline-none text-sm text-slate-700 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Lokasi</label>
                    <input
                      value={formLokasi}
                      onChange={(e) => setFormLokasi(e.target.value)}
                      placeholder="TA lt 11.3"
                      className="w-full outline-none text-sm text-slate-700 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
            ) : (
              <div className="text-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2">Kelas Berhasil Dibuat!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Bagikan kode ini ke mahasiswa untuk bergabung ke kelas.</p>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl py-4 px-6 flex items-center justify-center gap-3 mb-6">
                  <span className="text-2xl font-bold tracking-widest text-blue-600 dark:text-blue-400">{kodeBerhasil}</span>
                  <button onClick={() => copyKode(kodeBerhasil)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" title="Salin kode">
                    {copied ? <Check size={18} className="text-green-500 dark:text-green-400" /> : <Copy size={18} />}
                  </button>
                </div>

                <button
                  onClick={() => { setShowAddModal(false); setKodeBerhasil(null); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Selesai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Edit Class */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 w-[92vw] max-w-sm border border-transparent dark:border-slate-800">
            <form onSubmit={submitEditKelas}>
              <h2 className="text-center font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">Edit Kelas</h2>
              <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Nama Kelas</label>
                  <input
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    placeholder="IF 4A Pagi"
                    className="w-full outline-none text-sm text-slate-700 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Prodi</label>
                  <input
                    value={editPelajaran}
                    onChange={(e) => setEditPelajaran(e.target.value)}
                    placeholder="Informatika"
                    className="w-full outline-none text-sm text-slate-700 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Lokasi</label>
                  <input
                    value={editLokasi}
                    onChange={(e) => setEditLokasi(e.target.value)}
                    placeholder="TA lt 11.3"
                    className="w-full outline-none text-sm text-slate-700 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                </div>

                {editError && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs rounded-lg px-3 py-2">
                    {editError}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={tutupEditKelas}
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
        </div>
      )}

      {/* Modal Detail Anggota Kelas */}
      {selectedKelas && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 sm:p-6 w-[92vw] max-w-2xl max-h-[80vh] overflow-y-auto border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Anggota Kelas {selectedKelas.nama}</h2>
              <button onClick={() => setSelectedKelas(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none" title="Tutup">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Kode gabung: {selectedKelas.kode_gabung}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              {selectedKelas.total_mahasiswa} mahasiswa sudah bergabung • {selectedKelas.total_pending} menunggu approval
            </p>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-1 mb-4 w-fit">
              {(["semua", "pending", "approved"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                    filterStatus === f ? "bg-blue-600 text-white" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {f === "semua" ? "Semua" : f === "pending" ? "Menunggu Approval" : "Sudah Bergabung"}
                </button>
              ))}
            </div>

            {loadingAnggota && <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Memuat data...</p>}

            {!loadingAnggota && filteredAnggota.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Belum ada mahasiswa di kategori ini.</p>
            )}

            <div className="space-y-3">
              {filteredAnggota.map((a) => (
                <div key={a.id_anggota} className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${colorFor(a.id_mahasiswa)} flex items-center justify-center text-white font-bold text-sm`}>
                      {a.nama_mahasiswa.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.nama_mahasiswa}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{a.id_mahasiswa} • {a.angkatan ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      a.status === "approved"
                        ? "bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300"
                        : "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-300"
                    }`}>
                      {a.status === "approved" ? "Sudah Bergabung" : "Menunggu Approval"}
                    </span>

                    {a.status === "pending" && (
                      <button
                        onClick={() => approveAnggota(a.id_anggota)}
                        title="Setujui mahasiswa ini bergabung ke kelas"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Setujui
                      </button>
                    )}

                    <button
                      onClick={() => kickAnggota(a.id_anggota)}
                      title="Keluarkan mahasiswa ini dari kelas"
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Keluarkan
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