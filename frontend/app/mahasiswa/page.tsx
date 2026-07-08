"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";

interface AuthUser {
  id: string;
  name: string;
}

interface KelasSaya {
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  status: string;
}

interface RiwayatData {
  total_pertemuan: number;
  hadir: number;
  terlambat: number;
  tidak_hadir: number;
  data: { id: number; mata_kuliah: string; tanggal: string; waktu: string; status: string }[];
}

export default function MahasiswaPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [kelasSaya, setKelasSaya] = useState<KelasSaya[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) {
      window.location.href = "/auth/login";
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "mahasiswa") {
      window.location.href = "/dosen";
      return;
    }

    setUser(parsedUser);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    async function muatData(nim: string) {
      setLoading(true);
      try {
        const resRiwayat = await fetch(`http://localhost:8000/absensi/mahasiswa/${nim}`);
        const dataRiwayat = await resRiwayat.json();
        setRiwayat(dataRiwayat);

        const resProfil = await fetch(`http://localhost:8000/mahasiswa/${nim}`);
        const dataProfil = await resProfil.json();
        setFotoUrl(dataProfil?.foto_url ?? null);

        const resKelas = await fetch("http://localhost:8000/kelas");
        const dataKelas = await resKelas.json();

        const hasil: KelasSaya[] = [];
        for (const k of dataKelas.data ?? []) {
          const resAnggota = await fetch(`http://localhost:8000/kelas/${k.id}/anggota`);
          const dataAnggota = await resAnggota.json();
          const milikSaya = (dataAnggota.data ?? []).find(
            (a: { id_mahasiswa: string }) => a.id_mahasiswa === nim
          );
          if (milikSaya) {
            hasil.push({
              nama: k.nama,
              pelajaran: k.pelajaran,
              lokasi: k.lokasi,
              status: milikSaya.status,
            });
          }
        }
        setKelasSaya(hasil);
      } catch {
        // diam saja, tampilkan state kosong
      } finally {
        setLoading(false);
      }
    }
    muatData(user.id);
  }, [user]);

  const persenKehadiran =
    riwayat && riwayat.total_pertemuan > 0
      ? Math.round((riwayat.hadir / riwayat.total_pertemuan) * 100)
      : 0;

  const kelasApproved = kelasSaya.filter((k: KelasSaya) => k.status === "approved");
  const riwayatTerbaru = riwayat?.data?.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      <SidebarNav role="mahasiswa" />

      <section className="flex-1 p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Selamat Datang Kembali 👋</p>
            <h1 className="text-3xl font-bold">Dashboard Saya</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Lihat kelas yang diikuti, status absensi, dan ringkasan kehadiran Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-card text-card-foreground border border-border px-5 py-3 shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 font-bold text-blue-600 dark:text-blue-300 overflow-hidden">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto profil" className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : "M"
              )}
            </div>
            <div>
              <p className="font-bold">{user?.name ?? "Mahasiswa"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.id ?? "-"}</p>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-4 gap-5">
          <StatCard title="Kelas Diikuti" value={`${kelasApproved.length}`} color="border-blue-200 dark:border-blue-900" />
          <StatCard title="Kehadiran" value={`${persenKehadiran}%`} color="border-green-200 dark:border-green-900" />
          <StatCard title="Terlambat" value={`${riwayat?.terlambat ?? 0}`} color="border-yellow-200 dark:border-yellow-900" />
          <StatCard title="Tidak Hadir" value={`${riwayat?.tidak_hadir ?? 0}`} color="border-red-200 dark:border-red-900" />
        </section>

        <section className="mb-6 grid grid-cols-3 gap-6">
          <div className="rounded-2xl bg-card text-card-foreground border border-border p-6 shadow col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Kelas Saya</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Daftar kelas yang Anda ikuti dan status keanggotaan.
                </p>
              </div>

              <Link
                href="/mahasiswa/ambil-absensi"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
              >
                Ambil Absensi
              </Link>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-slate-400 dark:text-slate-500">Memuat data...</p>}

              {!loading && kelasSaya.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Anda belum bergabung ke kelas mana pun.{" "}
                  <Link href="/mahasiswa/gabung-kelas" className="text-blue-600 dark:text-blue-400 font-semibold">
                    Gabung kelas sekarang
                  </Link>
                  .
                </p>
              )}

              {kelasSaya.map((k: KelasSaya, i: number) => (
                <KelasCard key={i} nama={k.nama} pelajaran={k.pelajaran} lokasi={k.lokasi} status={k.status} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-card text-card-foreground border border-border p-6 shadow">
              <h2 className="mb-5 text-xl font-bold">Status Perangkat</h2>
              <DeviceStatus label="Kamera" value="Siap" />
              <DeviceStatus label="Registrasi Wajah" value="siap" />
            </div>

            <div className="rounded-2xl bg-card text-card-foreground border border-border p-6 shadow">
              <h2 className="mb-5 text-xl font-bold">Pengumuman</h2>
              <Notice text="Pastikan kamera aktif sebelum mengambil absensi." />
              <Notice text="Registrasi wajah wajib diperbarui jika sistem meminta verifikasi ulang." />
              <Notice text="Laporan kehadiran semester dapat dilihat pada menu Riwayat Saya." />
            </div>
          </aside>
        </section>

        <section className="rounded-2xl bg-card text-card-foreground border border-border p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Riwayat Singkat</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Aktivitas absensi terakhir Anda.</p>
            </div>

            <Link
              href="/mahasiswa/riwayat"
              className="rounded-xl border border-blue-300 dark:border-blue-700 px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400"
            >
              Lihat Riwayat Saya
            </Link>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="p-4">Mata Kuliah</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {!loading && riwayatTerbaru.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              )}

              {riwayatTerbaru.map((r) => (
                <RiwayatRow key={r.id} matkul={r.mata_kuliah} tanggal={r.tanggal} waktu={r.waktu} status={r.status} />
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl border bg-card text-card-foreground p-6 shadow ${color}`}>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <h2 className="mt-2 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function KelasCard({
  nama,
  pelajaran,
  lokasi,
  status,
}: {
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-800/40 p-5">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-bold">{nama}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                status === "approved"
                  ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300"
                  : "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300"
              }`}
            >
              {status === "approved" ? "Bergabung" : "Menunggu Persetujuan"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{pelajaran || "-"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lokasi || "-"}</p>
        </div>
      </div>
    </div>
  );
}

function DeviceStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span className="rounded-full bg-green-100 dark:bg-green-900/50 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-300">
        {value}
      </span>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="mb-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 p-4 text-sm text-slate-600 dark:text-slate-300">
      {text}
    </div>
  );
}

function RiwayatRow({
  matkul,
  tanggal,
  waktu,
  status,
}: {
  matkul: string;
  tanggal: string;
  waktu: string;
  status: string;
}) {
  const style =
    status === "hadir"
      ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300"
      : status === "terlambat"
      ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300"
      : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300";

  const label = status === "hadir" ? "Hadir" : status === "terlambat" ? "Terlambat" : "Tidak Hadir";

  return (
    <tr className="border-b border-border">
      <td className="p-4 font-semibold">{matkul}</td>
      <td className="p-4">{tanggal}</td>
      <td className="p-4">{waktu}</td>
      <td className="p-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>{label}</span>
      </td>
    </tr>
  );
}