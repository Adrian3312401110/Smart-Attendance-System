"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ProfileMahasiswaPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [passwordKonfirmasi, setPasswordKonfirmasi] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    fetch(`http://localhost:8000/mahasiswa/${parsedUser.id}`)
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
  }, [router]);

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

      const res = await fetch(`http://localhost:8000/mahasiswa/${user?.id ?? ""}`, {
        method: "PUT",
        body,
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setMessage({ type: "error", text: data.pesan ?? "Gagal menyimpan perubahan" });
        return;
      }

      setMessage({ type: "success", text: "Profil berhasil diperbarui" });

      const updatedUser = { ...user!, name: nama };
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server" });
    } finally {
      setSaving(false);
    }
  }

  async function ubahPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!passwordLama || !passwordBaru || !passwordKonfirmasi) {
      setPasswordMessage({ type: "error", text: "Semua field password wajib diisi" });
      return;
    }

    if (passwordBaru !== passwordKonfirmasi) {
      setPasswordMessage({ type: "error", text: "Konfirmasi password baru tidak cocok" });
      return;
    }

    if (passwordBaru.length < 12 || !/[^A-Za-z0-9]/.test(passwordBaru)) {
      setPasswordMessage({ type: "error", text: "Password baru minimal 12 karakter dan mengandung 1 simbol unik" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("http://localhost:8000/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          password_lama: passwordLama,
          password_baru: passwordBaru,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setPasswordMessage({ type: "error", text: data.pesan ?? "Gagal mengubah password" });
        return;
      }

      setPasswordMessage({ type: "success", text: "Password berhasil diubah" });
      setPasswordLama("");
      setPasswordBaru("");
      setPasswordKonfirmasi("");
    } catch {
      setPasswordMessage({ type: "error", text: "Tidak dapat terhubung ke server" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      <SidebarNav role="mahasiswa" />

      <section className="flex-1 p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Profil Saya</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola informasi akun Anda</p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Memuat data...</p>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-card text-card-foreground border border-border rounded-2xl shadow p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-28 h-28 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center text-4xl font-bold">
                  {nama ? nama.charAt(0).toUpperCase() : "M"}
                </div>

                <h2 className="text-xl font-bold">{nama || "-"}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Mahasiswa</p>
              </div>

              <div className="space-y-5 text-sm">
                <Info label="NIM" value={user?.id ?? "-"} />
                <Info label="Angkatan" value={angkatan || "-"} />
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className="rounded-full bg-green-100 dark:bg-green-900/50 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-300">
                    Aktif
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={simpanPerubahan} className="bg-card text-card-foreground border border-border rounded-2xl shadow p-8">
                <h2 className="text-xl font-bold mb-6">Informasi Akun</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={angkatan}
                    onChange={(e) => setAngkatan(e.target.value)}
                    placeholder="Angkatan"
                    className="border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={user?.id ?? ""}
                    disabled
                    placeholder="NIM"
                    className="border border-border rounded-lg px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 outline-none"
                  />
                </div>

                {message && (
                  <div
                    className={`mt-4 rounded-lg px-4 py-3 text-xs ${
                      message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
                        : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300"
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

              <form onSubmit={ubahPassword} className="bg-card text-card-foreground border border-border rounded-2xl shadow p-8">
                <h2 className="text-xl font-bold mb-2">Ubah Password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Password minimal 12 karakter dan mengandung 1 simbol unik.
                </p>

                <div className="grid grid-cols-1 gap-4 max-w-sm">
                  <input
                    value={passwordLama}
                    onChange={(e) => setPasswordLama(e.target.value)}
                    placeholder="Password Lama"
                    type="password"
                    className="border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    placeholder="Password Baru"
                    type="password"
                    className="border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={passwordKonfirmasi}
                    onChange={(e) => setPasswordKonfirmasi(e.target.value)}
                    placeholder="Konfirmasi Password Baru"
                    type="password"
                    className="border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {passwordMessage && (
                  <div
                    className={`mt-4 max-w-sm rounded-lg px-4 py-3 text-xs ${
                      passwordMessage.type === "success"
                        ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
                        : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300"
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="mt-6 rounded-xl border border-blue-300 dark:border-blue-700 px-5 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 disabled:opacity-50"
                >
                  {savingPassword ? "Menyimpan..." : "Ubah Password"}
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
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}