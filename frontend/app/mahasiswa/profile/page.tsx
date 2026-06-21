"use client";

import { useEffect, useState } from "react";
import SidebarMahasiswa from "@/components/SidebarMahasiswa";

const NIM = "3312401110"; // TODO: ganti dengan id mahasiswa dari sesi login

export default function ProfileMahasiswaPage() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/mahasiswa/${NIM}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.nama_mahasiswa) {
          setNama(data.nama_mahasiswa);
          setEmail(data.email ?? "");
          setAngkatan(data.angkatan ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function simpanPerubahan(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!nama.trim()) {
      setMessage({ type: "error", text: "Nama tidak boleh kosong" });
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.append("nama_mahasiswa", nama);
      body.append("email", email);
      body.append("angkatan", angkatan);

      const res = await fetch(`http://localhost:8000/mahasiswa/${NIM}`, {
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

  return (
    <main className="min-h-screen bg-slate-100 flex">
      <SidebarMahasiswa />

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Profil Saya</h1>
          <p className="text-sm text-slate-500">Kelola informasi akun Anda</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Memuat data...</p>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-28 h-28 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold mb-4">
                  {nama ? nama.charAt(0) : "M"}
                </div>

                <h2 className="text-xl font-bold">{nama || "-"}</h2>
                <p className="text-sm text-slate-500">Mahasiswa • Teknik Informatika</p>

                <button className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                  Ubah Foto
                </button>
              </div>

              <div className="space-y-5 text-sm">
                <Info label="NIM" value={NIM} />
                <Info label="Angkatan" value={angkatan || "-"} />
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
                    Aktif
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={simpanPerubahan} className="bg-white rounded-2xl shadow p-8">
                <h2 className="text-xl font-bold mb-6">Informasi Akun</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={angkatan}
                    onChange={(e) => setAngkatan(e.target.value)}
                    placeholder="Angkatan"
                    className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={NIM}
                    disabled
                    placeholder="NIM"
                    className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-slate-50 text-slate-400 outline-none"
                  />
                </div>

                {message && (
                  <div
                    className={`mt-4 rounded-lg px-4 py-3 text-xs ${
                      message.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-600"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}