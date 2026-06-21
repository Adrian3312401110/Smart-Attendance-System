"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NIM = "3312401110"; // TODO: ganti dengan id mahasiswa dari sesi login

const menu = [
  { label: "Dashboard", href: "/mahasiswa" },
  { label: "Gabung Kelas", href: "/mahasiswa/gabung-kelas" },
  { label: "Registrasi Wajah", href: "/mahasiswa/registrasi-wajah" },
  { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi" },
  { label: "Riwayat Mahasiswa", href: "/mahasiswa/riwayat" },
  { label: "Profile", href: "/mahasiswa/profile" },
];

interface KelasSaya {
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  status: "pending" | "approved" | "rejected";
}

export default function GabungKelasPage() {
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [kelasSaya, setKelasSaya] = useState<KelasSaya[]>([]);
  const [loadingKelas, setLoadingKelas] = useState(true);

  async function muatKelasSaya() {
    setLoadingKelas(true);
    try {
      const resKelas = await fetch("http://localhost:8000/kelas");
      const dataKelas = await resKelas.json();

      const hasil: KelasSaya[] = [];
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
      setKelasSaya([]);
    } finally {
      setLoadingKelas(false);
    }
  }

  useEffect(() => {
    muatKelasSaya();
  }, []);

  async function submitGabung(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!kode.trim()) {
      setMessage({ type: "error", text: "Masukkan kode kelas terlebih dahulu" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/kelas/gabung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode_gabung: kode.trim(), id_mahasiswa: NIM }),
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setMessage({ type: "error", text: data.pesan ?? "Gagal bergabung ke kelas" });
        return;
      }

      setMessage({ type: "success", text: data.pesan });
      setKode("");
      muatKelasSaya();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server" });
    } finally {
      setLoading(false);
    }
  }

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
                item.href === "/mahasiswa/gabung-kelas"
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
        <header className="mb-6">
          <p className="text-sm font-bold text-blue-600">Mahasiswa • Keanggotaan Kelas</p>
          <h1 className="text-3xl font-bold">Gabung Kelas</h1>
          <p className="text-sm text-slate-500">
            Masukkan kode kelas yang diberikan dosen untuk mengajukan permintaan bergabung.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Masukkan Kode Kelas</h2>

            <form onSubmit={submitGabung} className="flex gap-3">
              <input
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="contoh: nx83e3n#"
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {loading ? "Mengirim..." : "Gabung"}
              </button>
            </form>

            {message && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-600"
                }`}
              >
                {message.text}
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4">
              Setelah mengirim kode, dosen perlu menyetujui permintaan Anda sebelum Anda dapat mengambil absensi di kelas ini.
            </p>
          </div>

          <aside className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold mb-4">Panduan</h2>
            <Guide number="1" text="Minta kode kelas dari dosen pengampu." />
            <Guide number="2" text="Masukkan kode tersebut persis seperti yang diberikan." />
            <Guide number="3" text="Tunggu dosen menyetujui permintaan bergabung Anda." />
          </aside>
        </section>

        <section className="bg-white rounded-2xl shadow p-6 mt-6">
          <h2 className="text-xl font-bold mb-5">Kelas Saya</h2>

          {loadingKelas && <p className="text-sm text-slate-400">Memuat data...</p>}

          {!loadingKelas && kelasSaya.length === 0 && (
            <p className="text-sm text-slate-400">Anda belum bergabung ke kelas mana pun.</p>
          )}

          <div className="space-y-3">
            {kelasSaya.map((k, i) => (
              <div key={i} className="flex items-center justify-between border border-slate-100 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-slate-800">{k.nama}</p>
                  <p className="text-sm text-slate-500">{k.pelajaran || "-"} • {k.lokasi || "-"}</p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    k.status === "approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {k.status === "approved" ? "Bergabung" : "Menunggu Persetujuan"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Guide({ number, text }: { number: string; text: string }) {
  return (
    <div className="mb-3 flex gap-3 rounded-xl bg-blue-50 p-3 text-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {number}
      </span>
      <p>{text}</p>
    </div>
  );
}