"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";

interface KelasSaya {
  nama: string;
  pelajaran: string | null;
  lokasi: string | null;
  status: "pending" | "approved" | "rejected";
}

export default function GabungKelasPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [kelasSaya, setKelasSaya] = useState<KelasSaya[]>([]);
  const [loadingKelas, setLoadingKelas] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) {
      router.replace("/auth/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "mahasiswa") {
      router.replace("/dosen");
      return;
    }

    setUser(parsedUser);
  }, [router]);

  async function muatKelasSaya() {
    if (!user?.id) return;
    setLoadingKelas(true);
    try {
      const resKelas = await fetch("http://localhost:8000/kelas");
      const dataKelas = await resKelas.json();

      const hasil: KelasSaya[] = [];
      for (const k of dataKelas.data ?? []) {
        const resAnggota = await fetch(`http://localhost:8000/kelas/${k.id}/anggota`);
        const dataAnggota = await resAnggota.json();
        const milikSaya = (dataAnggota.data ?? []).find(
          (a: { id_mahasiswa: string }) => a.id_mahasiswa === user?.id
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
    if (user?.id) {
      muatKelasSaya();
    }
  }, [user]);

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
        body: JSON.stringify({ kode_gabung: kode.trim(), id_mahasiswa: user?.id }),
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
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <SidebarNav role="mahasiswa" />

      <div className="flex-1 flex flex-col">
        <section className="flex-1 p-8">
          <header className="mb-6">
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Mahasiswa • Keanggotaan Kelas</p>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gabung Kelas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Masukkan kode kelas yang diberikan dosen untuk mengajukan permintaan bergabung.
            </p>
          </header>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-transparent dark:border-slate-800">
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Masukkan Kode Kelas</h2>

              <form onSubmit={submitGabung} className="flex flex-col sm:flex-row gap-3">
                <input
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  placeholder="contoh: nx83e3n#"
                  className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
                >
                  {loading ? "Mengirim..." : "Gabung"}
                </button>
              </form>

              {message && (
                <div
                  className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Setelah mengirim kode, dosen perlu menyetujui permintaan Anda sebelum Anda dapat mengambil absensi di kelas ini.
              </p>
            </div>

            <aside className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-transparent dark:border-slate-800">
              <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Panduan</h2>
              <Guide number="1" text="Minta kode kelas dari dosen pengampu." />
              <Guide number="2" text="Masukkan kode tersebut persis seperti yang diberikan." />
              <Guide number="3" text="Tunggu dosen menyetujui permintaan bergabung Anda." />
            </aside>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 mt-6 border border-transparent dark:border-slate-800">
            <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-slate-100">Kelas Saya</h2>

            {loadingKelas && <p className="text-sm text-slate-400 dark:text-slate-500">Memuat data...</p>}

            {!loadingKelas && kelasSaya.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">Anda belum bergabung ke kelas mana pun.</p>
            )}

            <div className="space-y-3">
              {kelasSaya.map((k, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-xl p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{k.nama}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{k.pelajaran || "-"} • {k.lokasi || "-"}</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      k.status === "approved"
                        ? "bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300"
                        : k.status === "rejected"
                        ? "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300"
                        : "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-300"
                    }`}
                  >
                    {k.status === "approved" ? "Bergabung" : k.status === "rejected" ? "Ditolak" : "Menunggu Persetujuan"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function Guide({ number, text }: { number: string; text: string }) {
  return (
    <div className="mb-3 flex gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 text-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white flex-shrink-0">
        {number}
      </span>
      <p className="text-slate-700 dark:text-slate-200">{text}</p>
    </div>
  );
}