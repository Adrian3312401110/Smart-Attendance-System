"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MahasiswaPage() {
  const pathname = usePathname();
  const menu = [
  { label: "Dashboard", href: "/mahasiswa" },
  { label: "Registrasi Wajah", href: "/mahasiswa/registrasi-wajah" },
  { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi" },
  { label: "Riwayat Mahasiswa", href: "/mahasiswa/riwayat" },
  { label: "Profile", href: "/mahasiswa/profile" },
];

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
            <p className="text-sm font-semibold text-blue-600">
              Selamat Datang Kembali 👋
            </p>
            <h1 className="text-3xl font-bold">Dashboard Saya</h1>
            <p className="text-sm text-slate-500">
              Lihat jadwal hari ini, status absensi, dan ringkasan kehadiran Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
              M
            </div>
            <div>
              <p className="font-bold">Mikaa</p>
              <p className="text-sm text-slate-500">TI-4A • Teknik Informatika</p>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-4 gap-5">
          <StatCard title="Kelas Hari Ini" value="3" color="border-blue-200" />
          <StatCard title="Kehadiran Semester" value="92%" color="border-green-200" />
          <StatCard title="Terlambat" value="4" color="border-yellow-200" />
          <StatCard title="Belum Absen" value="1" color="border-red-200" />
        </section>

        <section className="mb-6 grid grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Jadwal Hari Ini</h2>
                <p className="text-sm text-slate-500">
                  Pantau mata kuliah yang berlangsung dan akses absensi dengan cepat.
                </p>
              </div>

              <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                Ambil Absensi
              </button>
            </div>

            <div className="space-y-4">
              <JadwalCard
                matkul="Kecerdasan Buatan"
                dosen="Dr. Andi Saputra"
                waktu="08:00 - 09:40"
                ruang="Ruang 204"
                status="Absensi Dibuka"
                active
              />

              <JadwalCard
                matkul="Jaringan Komputer"
                dosen="Dra. Maya Putri"
                waktu="10:00 - 11:40"
                ruang="Ruang 102"
                status="Belum Dimulai"
              />

              <JadwalCard
                matkul="Basis Data"
                dosen="Ir. Fajar Nugroho"
                waktu="13:00 - 14:40"
                ruang="Lab Komputer 1"
                status="Selesai"
              />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-5 text-xl font-bold">Status Perangkat</h2>
              <DeviceStatus label="Kamera" value="Siap" />
              <DeviceStatus label="Lokasi" value="Aktif" />
              <DeviceStatus label="Registrasi Wajah" value="Terverifikasi" />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-5 text-xl font-bold">Pengumuman</h2>
              <Notice text="Pastikan kamera dan lokasi aktif sebelum mengambil absensi." />
              <Notice text="Registrasi wajah wajib diperbarui jika sistem meminta verifikasi ulang." />
              <Notice text="Laporan kehadiran semester dapat dilihat pada menu Riwayat Saya." />
            </div>
          </aside>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Riwayat Singkat</h2>
              <p className="text-sm text-slate-500">
                Tiga aktivitas absensi terakhir Anda.
              </p>
            </div>

            <button className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-600">
              Lihat Riwayat Saya
            </button>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500">
                <th className="p-4">Mata Kuliah</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Status</th>
                <th className="p-4">Aksi</th>
              </tr>
            </thead>

            <tbody>
              <RiwayatRow matkul="Algoritma" tanggal="16 Apr 2026" waktu="08:03" status="Hadir" />
              <RiwayatRow matkul="Pemrograman Web" tanggal="15 Apr 2026" waktu="10:07" status="Terlambat" />
              <RiwayatRow matkul="Sistem Operasi" tanggal="14 Apr 2026" waktu="-" status="Tidak Hadir" />
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

function JadwalCard({
  matkul,
  dosen,
  waktu,
  ruang,
  status,
  active = false,
}: {
  matkul: string;
  dosen: string;
  waktu: string;
  ruang: string;
  status: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-bold">{matkul}</h3>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
              {status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{dosen}</p>
          <p className="mt-2 text-sm">
            {waktu} &nbsp;&nbsp; {ruang}
          </p>
        </div>

        <div className="flex gap-3">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">
            Detail
          </button>

          {active && (
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Ambil Absensi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
        {value}
      </span>
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
  return (
    <tr className="border-b">
      <td className="p-4 font-semibold">{matkul}</td>
      <td className="p-4">{tanggal}</td>
      <td className="p-4">{waktu}</td>
      <td className="p-4">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
          {status}
        </span>
      </td>
      <td className="p-4">
        <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">
          Detail
        </button>
      </td>
    </tr>
  );
}