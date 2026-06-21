"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NIM = "3312401110"; // TODO: ganti dengan id mahasiswa dari sesi login

export default function MahasiswaPage() {
  const pathname = usePathname();
  const menu = [
    { label: "Dashboard", href: "/mahasiswa" },
    { label: "Gabung Kelas", href: "/mahasiswa/gabung-kelas" },
    { label: "Registrasi Wajah", href: "/mahasiswa/registrasi-wajah" },
    { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi" },
    { label: "Riwayat Mahasiswa", href: "/mahasiswa/riwayat" },
    { label: "Profile", href: "/mahasiswa/profile" },
  ];

  const [kelasSaya, setKelasSaya] = useState<
    { nama: string; pelajaran: string | null; lokasi: string | null; status: string }[]
  >([]);
  const [riwayat, setRiwayat] = useState<{
    total_pertemuan: number;
    hadir: number;
    terlambat: number;
    tidak_hadir: number;
    data: { id: number; mata_kuliah: string; tanggal: string; waktu: string; status: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function muatData() {
      setLoading(true);
      try {
        const resRiwayat = await fetch(`http://localhost:8000/absensi/mahasiswa/${NIM}`);
        const dataRiwayat = await resRiwayat.json();
        setRiwayat(dataRiwayat);

        const resKelas = await fetch("http://localhost:8000/kelas");
        const dataKelas = await resKelas.json();

        const hasil = [];
        for (const k of dataKelas.data ?? []) {
          const resAnggota = await fetch(`http://localhost:8000/kelas/${k.id}/anggota`);
          const dataAnggota = await resAnggota.json();
          const milikSaya = (dataAnggota.data ?? []).find(
            (a: { id_mahasiswa: string }) => a.id_mahasiswa === NIM
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
    muatData();
  }, []);

  const persenKehadiran =
    riwayat && riwayat.total_pertemuan > 0
      ? Math.round((riwayat.hadir / riwayat.total_pertemuan) * 100)
      : 0;

  const kelasApproved = kelasSaya.filter((k) => k.status === "approved");
  const riwayatTerbaru = riwayat?.data?.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-slate-100 flex">
      <aside className="w-72 min-h-screen bg-blue-700 text-white p-6">
        <div className="mb-10">
          <h1 className="text-xl font-bold">Smart Attendance</h1>
          <p className="text-sm text-blue-100">Panel Mahasiswa</p>
        </div>

        <nav className="space-y-3">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 font-medium ${
                pathname === item.href
                  ? "bg-white text-blue-700"
                  : "text-blue-100 hover:bg-blue-600 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Selamat Datang Kembali 👋</p>
            <h1 className="text-3xl font-bold">Dashboard Saya</h1>
            <p className="text-sm text-slate-500">
              Lihat kelas yang diikuti, status absensi, dan ringkasan kehadiran Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
              M
            </div>
            <div>
              <p className="font-bold">Mahasiswa</p>
              <p className="text-sm text-slate-500">{NIM}</p>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-4 gap-5">
          <StatCard title="Kelas Diikuti" value={`${kelasApproved.length}`} color="border-blue-200" />
          <StatCard title="Kehadiran" value={`${persenKehadiran}%`} color="border-green-200" />
          <StatCard title="Terlambat" value={`${riwayat?.terlambat ?? 0}`} color="border-yellow-200" />
          <StatCard title="Tidak Hadir" value={`${riwayat?.tidak_hadir ?? 0}`} color="border-red-200" />
        </section>

        <section className="mb-6 grid grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Kelas Saya</h2>
                <p className="text-sm text-slate-500">
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
              {loading && <p className="text-sm text-slate-400">Memuat data...</p>}

              {!loading && kelasSaya.length === 0 && (
                <p className="text-sm text-slate-400">
                  Anda belum bergabung ke kelas mana pun.{" "}
                  <Link href="/mahasiswa/gabung-kelas" className="text-blue-600 font-semibold">
                    Gabung kelas sekarang
                  </Link>
                  .
                </p>
              )}

              {kelasSaya.map((k, i) => (
                <KelasCard key={i} nama={k.nama} pelajaran={k.pelajaran} lokasi={k.lokasi} status={k.status} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-5 text-xl font-bold">Status Perangkat</h2>
              <DeviceStatus label="Kamera" value="Siap" />
              <DeviceStatus label="Registrasi Wajah" value="Lihat halaman Registrasi" />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-5 text-xl font-bold">Pengumuman</h2>
              <Notice text="Pastikan kamera aktif sebelum mengambil absensi." />
              <Notice text="Registrasi wajah wajib diperbarui jika sistem meminta verifikasi ulang." />
              <Notice text="Laporan kehadiran semester dapat dilihat pada menu Riwayat Saya." />
            </div>
          </aside>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Riwayat Singkat</h2>
              <p className="text-sm text-slate-500">Aktivitas absensi terakhir Anda.</p>
            </div>

            <Link
              href="/mahasiswa/riwayat"
              className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-600"
            >
              Lihat Riwayat Saya
            </Link>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500">
                <th className="p-4">Mata Kuliah</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {!loading && riwayatTerbaru.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
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
    <div className={`rounded-2xl border bg-white p-6 shadow ${color}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-bold">{nama}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                status === "approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
              }`}
            >
              {status === "approved" ? "Bergabung" : "Menunggu Persetujuan"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{pelajaran || "-"}</p>
          <p className="mt-1 text-sm text-slate-500">{lokasi || "-"}</p>
        </div>
      </div>
    </div>
  );
}

function DeviceStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">{value}</span>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div className="mb-3 rounded-xl bg-blue-50 p-4 text-sm text-slate-600">{text}</div>;
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
      ? "bg-green-100 text-green-600"
      : status === "terlambat"
      ? "bg-yellow-100 text-yellow-600"
      : "bg-red-100 text-red-600";

  const label = status === "hadir" ? "Hadir" : status === "terlambat" ? "Terlambat" : "Tidak Hadir";

  return (
    <tr className="border-b">
      <td className="p-4 font-semibold">{matkul}</td>
      <td className="p-4">{tanggal}</td>
      <td className="p-4">{waktu}</td>
      <td className="p-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>{label}</span>
      </td>
    </tr>
  );
}