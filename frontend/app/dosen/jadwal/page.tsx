"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Search, Bell, Maximize, ChevronDown,
  Plus, Trash2, Pencil, MapPin, X
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

const KAMPUS_LAT = 1.1188560591870436
const KAMPUS_LON = 104.04843981451464;

interface JadwalDetail {
  id: number;
  id_dosen: string;
  nama_dosen: string;
  id_kelas: number | null;
  nama_kelas?: string | null;
  id_mata_kuliah: string;
  nama_mata_kuliah: string;
  hari: string;
  jam: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  toleransi_telat_menit: number;
  latitude: number | null;
  longitude: number | null;
  radius_meter: number | null;
  gps_aktif: boolean;
  jumlah_gesture: number;
  mode_absensi: "tetap" | "acak";
  daftar_jam_absensi: string[];
  aktif: boolean;
}

interface MataKuliahItem {
  id_mata_kuliah: string;
  nama: string;
  sks: number | null;
}

interface KelasItem {
  id: number;
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  kode_gabung: string;
  id_dosen: string;
  total_mahasiswa: number;
}

interface FormJadwal {
  kelasId: string;
  mataKuliah: string;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  toleransiTelatMenit: number;
  lat: number;
  lon: number;
  radius: number;
  gpsAktif: boolean;
  jumlahGesture: number;
  modeAbsensi: "tetap" | "acak";
  daftarJam: string[];
  jumlahSesiAcak: number;
  jamBaru: string;
}

function formAwal(): FormJadwal {
  return {
    kelasId: "",
    mataKuliah: "",
    hari: "Senin",
    jamMulai: "08:30",
    jamSelesai: "10:20",
    toleransiTelatMenit: 10,
    lat: KAMPUS_LAT,
    lon: KAMPUS_LON,
    radius: 200,
    gpsAktif: true,
    jumlahGesture: 3,
    modeAbsensi: "tetap",
    daftarJam: [],
    jumlahSesiAcak: 1,
    jamBaru: "",
  };
}

export default function DosenJadwalPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [jadwalList, setJadwalList] = useState<JadwalDetail[]>([]);
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliahItem[]>([]);
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormJadwal>(formAwal());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormJadwal>(formAwal());
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  function muatJadwal() {
    setLoading(true);
    fetch("http://localhost:8000/jadwal/detail")
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.data ?? []).filter((item: JadwalDetail) => item.id_dosen === authUser?.id);
        setJadwalList(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
  if (!authUser?.id) return;
  muatJadwal();
  fetch("http://localhost:8000/mata-kuliah")
    .then((r) => r.json())
    .then((data) => setMataKuliahList(data.data ?? []))
    .catch(() => {});
  fetch(`http://localhost:8000/kelas?id_dosen=${authUser.id}`)
    .then((r) => r.json())
    .then((data) => setKelasList(data.data ?? []))
    .catch(() => {});
  fetch(`http://localhost:8000/dosen/${authUser.id}`)
    .then((r) => r.json())
    .then((data) => setFotoUrl(data?.foto_url ?? null))
    .catch(() => {});
}, [authUser]);

  function tambahJamTetap(target: "form" | "edit") {
    const state = target === "form" ? form : editForm;
    const setState = target === "form" ? setForm : setEditForm;
    if (!state.jamBaru) return;
    if (state.daftarJam.includes(state.jamBaru)) return;
    setState({ ...state, daftarJam: [...state.daftarJam, state.jamBaru].sort(), jamBaru: "" });
  }

  function hapusJamTetap(target: "form" | "edit", jam: string) {
    const state = target === "form" ? form : editForm;
    const setState = target === "form" ? setForm : setEditForm;
    setState({ ...state, daftarJam: state.daftarJam.filter((j) => j !== jam) });
  }

  async function submitJadwal(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.kelasId || !form.mataKuliah || !form.hari || !form.jamMulai || !form.jamSelesai) {
      setFormError("Semua field wajib diisi");
      return;
    }
    if (form.modeAbsensi === "tetap" && form.daftarJam.length === 0) {
      setFormError("Tambahkan minimal satu jam absensi, atau gunakan mode acak");
      return;
    }

    setSubmitting(true);
    try {
      if (!authUser?.id) {
        setFormError("Sesi login tidak valid");
        return;
      }

      const body = new FormData();
      body.append("id_dosen", authUser.id);
      body.append("id_kelas", form.kelasId);
      body.append("id_mata_kuliah", form.mataKuliah);
      body.append("hari", form.hari);
      body.append("jam_mulai", form.jamMulai);
      body.append("jam_selesai", form.jamSelesai);
      body.append("toleransi_telat_menit", String(form.toleransiTelatMenit));
      body.append("latitude", String(form.lat));
      body.append("longitude", String(form.lon));
      body.append("radius_meter", String(form.radius));
      body.append("gps_aktif", String(form.gpsAktif));
      body.append("jumlah_gesture", String(form.jumlahGesture));
      body.append("mode_absensi", form.modeAbsensi);
      body.append("daftar_jam_absensi", JSON.stringify(form.daftarJam));
      body.append("jumlah_sesi_acak", String(form.jumlahSesiAcak));

      const res = await fetch("http://localhost:8000/jadwal", { method: "POST", body });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setFormError(data.pesan ?? "Gagal menambahkan jadwal");
        return;
      }

      setShowForm(false);
      setForm(formAwal());
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

  async function toggleAktif(row: JadwalDetail) {
    try {
      const body = new FormData();
      body.append("aktif", String(!row.aktif));
      await fetch(`http://localhost:8000/jadwal/${row.id}/toggle-aktif`, { method: "PUT", body });
      muatJadwal();
    } catch {
      alert("Gagal mengubah status jadwal");
    }
  }

  function bukaEdit(row: JadwalDetail) {
    setEditId(row.id);
    setEditForm({
      kelasId: row.id_kelas ? String(row.id_kelas) : "",
      mataKuliah: row.id_mata_kuliah,
      hari: row.hari,
      jamMulai: row.jam_mulai ?? "08:00",
      jamSelesai: row.jam_selesai ?? "09:40",
      toleransiTelatMenit: row.toleransi_telat_menit ?? 30,
      lat: row.latitude ?? KAMPUS_LAT,
      lon: row.longitude ?? KAMPUS_LON,
      radius: row.radius_meter ?? 200,
      gpsAktif: row.gps_aktif,
      jumlahGesture: row.jumlah_gesture,
      modeAbsensi: row.mode_absensi,
      daftarJam: row.daftar_jam_absensi ?? [],
      jumlahSesiAcak: row.daftar_jam_absensi?.length || 1,
      jamBaru: "",
    });
    setEditError("");
    setShowEdit(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    if (editId === null) return;

    if (!editForm.kelasId) {
      setEditError("Kelas wajib dipilih");
      return;
    }
    if (editForm.modeAbsensi === "tetap" && editForm.daftarJam.length === 0) {
      setEditError("Tambahkan minimal satu jam absensi, atau gunakan mode acak");
      return;
    }

    setEditSubmitting(true);
    try {
      const body = new FormData();
      body.append("id_kelas", editForm.kelasId);
      body.append("id_mata_kuliah", editForm.mataKuliah);
      body.append("hari", editForm.hari);
      body.append("jam_mulai", editForm.jamMulai);
      body.append("jam_selesai", editForm.jamSelesai);
      body.append("toleransi_telat_menit", String(editForm.toleransiTelatMenit));
      body.append("latitude", String(editForm.lat));
      body.append("longitude", String(editForm.lon));
      body.append("radius_meter", String(editForm.radius));
      body.append("gps_aktif", String(editForm.gpsAktif));
      body.append("jumlah_gesture", String(editForm.jumlahGesture));
      body.append("mode_absensi", editForm.modeAbsensi);
      body.append("daftar_jam_absensi", JSON.stringify(editForm.daftarJam));
      body.append("jumlah_sesi_acak", String(editForm.jumlahSesiAcak));

      const res = await fetch(`http://localhost:8000/jadwal/${editId}`, { method: "PUT", body });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setEditError(data.pesan ?? "Gagal memperbarui jadwal");
        return;
      }

      setShowEdit(false);
      setEditId(null);
      muatJadwal();
    } catch {
      setEditError("Tidak dapat terhubung ke server");
    } finally {
      setEditSubmitting(false);
    }
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
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
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">{fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : userInitials}</div>
              <div className="text-left">
                <p className="text-white text-xs font-medium">{authUser?.name ?? "Dosen"}</p>
                <p className="text-white/70 text-[11px]">{authUser?.email ?? "-"}</p>
              </div>
              <ChevronDown size={12} className="text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Class List /</p>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setForm(formAwal()); setFormError(""); setShowForm(true); }}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Tambah Jadwal
                </button>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Daftar Jadwal Kelas</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 dark:text-slate-500">Today:</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{today}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 px-3">No.</th>
                    <th className="pb-3 px-3">Hari / Jam</th>
                    <th className="pb-3 px-3">Kelas</th>
                    <th className="pb-3 px-3">Mata Kuliah</th>
                    <th className="pb-3 px-3">Lokasi</th>
                    <th className="pb-3 px-3">GPS</th>
                    <th className="pb-3 px-3">Gesture</th>
                    <th className="pb-3 px-3">Jam Absensi</th>
                    <th className="pb-3 px-3">Telat</th>
                    <th className="pb-3 px-3">Aktif</th>
                    <th className="pb-3 px-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={11} className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Memuat data...</td></tr>
                  )}
                  {!loading && jadwalList.length === 0 && (
                    <tr><td colSpan={11} className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Belum ada jadwal.</td></tr>
                  )}
                  {jadwalList.map((row, i) => (
                    <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-3">
                        <div className="w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {i + 1}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-slate-700 dark:text-slate-200">{row.hari}<br /><span className="text-xs text-slate-400 dark:text-slate-500">{row.jam}</span></td>
                      <td className="py-4 px-3 text-sm text-slate-700 dark:text-slate-200">{row.nama_kelas ?? "-"}</td>
                      <td className="py-4 px-3 text-sm font-medium text-slate-800 dark:text-slate-100">{row.nama_mata_kuliah}</td>
                      <td className="py-4 px-3">
                        <span className={`flex items-center gap-1 text-xs font-medium ${row.latitude && row.longitude ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                          <MapPin size={13} />
                          {row.latitude && row.longitude ? "Sudah diatur" : "Belum diatur"}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${row.gps_aktif ? "bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                          {row.gps_aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-sm text-slate-600 dark:text-slate-300">{row.jumlah_gesture}x</td>
                      <td className="py-4 px-3 text-xs text-slate-500 dark:text-slate-400">
                        {row.daftar_jam_absensi?.length > 0 ? row.daftar_jam_absensi.join(", ") : "-"}
                        <br />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{row.mode_absensi}</span>
                      </td>
                      <td className="py-4 px-3 text-xs text-slate-500 dark:text-slate-400">
                        +{row.toleransi_telat_menit ?? 0} menit
                      </td>
                      <td className="py-4 px-3">
                        <button
                        type="button"
                        onClick={() => toggleAktif(row)}
                        role="switch"
                        aria-checked={row.aktif}
                        className={`w-11 h-6 rounded-full relative transition-colors duration-200 border ${
                          row.aktif
                            ? "bg-blue-600 border-blue-600"
                            : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform duration-200 ${
                            row.aktif ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => bukaEdit(row)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => hapusJadwal(row.id)} className="text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <FormJadwalModal
          title="Tambah Jadwal Kelas"
          form={form}
          setForm={setForm}
          kelasList={kelasList}
          mataKuliahList={mataKuliahList}
          error={formError}
          submitting={submitting}
          onSubmit={submitJadwal}
          onClose={() => setShowForm(false)}
          onTambahJam={() => tambahJamTetap("form")}
          onHapusJam={(jam) => hapusJamTetap("form", jam)}
        />
      )}

      {showEdit && (
        <FormJadwalModal
          title="Edit Jadwal Kelas"
          form={editForm}
          setForm={setEditForm}
          kelasList={kelasList}
          mataKuliahList={mataKuliahList}
          error={editError}
          submitting={editSubmitting}
          onSubmit={submitEdit}
          onClose={() => setShowEdit(false)}
          onTambahJam={() => tambahJamTetap("edit")}
          onHapusJam={(jam) => hapusJamTetap("edit", jam)}
        />
      )}
    </div>
  );
}

function FormJadwalModal({
  title, form, setForm, kelasList, mataKuliahList, error, submitting, onSubmit, onClose, onTambahJam, onHapusJam,
}: {
  title: string;
  form: FormJadwal;
  setForm: (f: FormJadwal) => void;
  kelasList: KelasItem[];
  mataKuliahList: MataKuliahItem[];
  error: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onTambahJam: () => void;
  onHapusJam: (jam: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center overflow-y-auto py-8">
      <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-[30rem] relative border border-transparent dark:border-slate-800">
        <button type="button" onClick={onClose} className="absolute top-5 right-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
          <X size={18} />
        </button>
        <h2 className="text-center font-bold text-slate-800 dark:text-slate-100 text-lg mb-6">{title}</h2>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Kelas</label>
            <select
              value={form.kelasId}
              onChange={(e) => setForm({ ...form, kelasId: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih kelas --</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Mata Kuliah</label>
            <select
              value={form.mataKuliah}
              onChange={(e) => setForm({ ...form, mataKuliah: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih mata kuliah --</option>
              {mataKuliahList.map((mk) => (
                <option key={mk.id_mata_kuliah} value={mk.id_mata_kuliah}>{mk.nama} ({mk.id_mata_kuliah})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Hari</label>
            <select
              value={form.hari}
              onChange={(e) => setForm({ ...form, hari: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Jam Mulai</label>
              <input
                type="time"
                value={form.jamMulai}
                onChange={(e) => setForm({ ...form, jamMulai: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Jam Selesai</label>
              <input
                type="time"
                value={form.jamSelesai}
                onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Toleransi Telat (menit)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              value={form.toleransiTelatMenit}
              onChange={(e) => setForm({ ...form, toleransiTelatMenit: Number(e.target.value) })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Mahasiswa yang absen melewati jam target masih diterima selama masih dalam rentang ini, namun statusnya tercatat &quot;Terlambat&quot;.
            </p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Lokasi Kelas (klik peta untuk menandai)</label>
            <LocationPicker
              lat={form.lat}
              lon={form.lon}
              radius={form.radius}
              onChange={(lat, lon) => setForm({ ...form, lat, lon })}
            />
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Radius toleransi (m)</label>
              <input
                type="number"
                min={20}
                max={1000}
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })}
                className="w-24 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1 text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Validasi Lokasi GPS Anti-Spoofing</span>
            <button
  type="button"
  onClick={() => setForm({ ...form, gpsAktif: !form.gpsAktif })}
  role="switch"
  aria-checked={form.gpsAktif}
  className={`w-11 h-6 rounded-full relative transition-colors duration-200 border ${
    form.gpsAktif
      ? "bg-blue-600 border-blue-600"
      : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
  }`}
>
  <span
    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform duration-200 ${
      form.gpsAktif ? "translate-x-5" : "translate-x-0"
    }`}
  />
</button>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Jumlah Gesture per Sesi Absensi</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, jumlahGesture: n })}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.jumlahGesture === n ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Metode Jadwal Absensi</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, modeAbsensi: "tetap" })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.modeAbsensi === "tetap" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
              >
                Jam Tetap
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, modeAbsensi: "acak" })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.modeAbsensi === "acak" ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
              >
                Jam Acak
              </button>
            </div>

            {form.modeAbsensi === "tetap" ? (
              <div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="time"
                    value={form.jamBaru}
                    onChange={(e) => setForm({ ...form, jamBaru: e.target.value })}
                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <button type="button" onClick={onTambahJam} className="bg-slate-800 hover:bg-slate-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-semibold px-3 rounded-lg transition-colors">
                    Tambah
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.daftarJam.map((jam) => (
                    <span key={jam} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full">
                      {jam}
                      <button type="button" onClick={() => onHapusJam(jam)}><X size={12} /></button>
                    </span>
                  ))}
                  {form.daftarJam.length === 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Belum ada jam absensi ditambahkan</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Jumlah sesi absensi acak dalam rentang jam kelas</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.jumlahSesiAcak}
                  onChange={(e) => setForm({ ...form, jumlahSesiAcak: Number(e.target.value) })}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm outline-none"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Sistem akan memilih waktu acak sebanyak jumlah ini di antara jam mulai dan selesai.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Batal
          </button>
          <button type="submit" disabled={submitting} className="flex-1 bg-[#1a1f36] dark:bg-blue-700 hover:bg-[#242b4a] dark:hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}