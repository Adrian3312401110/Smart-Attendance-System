"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Maximize, ChevronDown, Camera, Lock } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DosenSettingsPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoError, setFotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;
      if (parsedUser.role !== "dosen") {
        router.replace("/mahasiswa");
        return;
      }
      setAuthUser(parsedUser);
      fetch(`http://localhost:8000/dosen/${parsedUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.nama_dosen) {
            setNamaLengkap(data.nama_dosen);
            setEmail(data.email ?? "");
            setFotoUrl(data.foto_url ?? null);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch {
      router.replace("/auth/login");
    }
  }, [router]);

  async function simpanPerubahan() {
    setMessage(null);
    if (!namaLengkap.trim()) {
      setMessage({ type: "error", text: "Nama tidak boleh kosong" });
      return;
    }

    setSaving(true);
    try {
      if (!authUser?.id) {
        setMessage({ type: "error", text: "Sesi login tidak valid" });
        return;
      }

      const body = new FormData();
      body.append("nama_dosen", namaLengkap);
      body.append("email", email);

      const res = await fetch(`http://localhost:8000/dosen/${authUser.id}`, {
        method: "PUT",
        body,
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setMessage({ type: "error", text: data.pesan ?? "Gagal menyimpan perubahan" });
        return;
      }

      setMessage({ type: "success", text: "Profil berhasil diperbarui" });

      const updatedUser = { ...authUser, name: namaLengkap };
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      setAuthUser(updatedUser);
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server" });
    } finally {
      setSaving(false);
    }
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !authUser?.id) return;

    if (!file.type.startsWith("image/")) {
      setFotoError("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFotoError("Ukuran gambar maksimal 5MB");
      return;
    }

    setFotoError("");
    setUploadingFoto(true);
    try {
      const body = new FormData();
      body.append("foto", file);

      const res = await fetch(`http://localhost:8000/dosen/${authUser.id}/foto`, {
        method: "POST",
        body,
      });
      const data = await res.json();

      if (!res.ok || data.berhasil === false) {
        setFotoError(data.pesan ?? "Gagal mengunggah foto");
        return;
      }

      setFotoUrl(`${data.foto_url}?t=${Date.now()}`);
    } catch {
      setFotoError("Tidak dapat terhubung ke server");
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          email: authUser?.email,
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

  const [firstName, ...rest] = namaLengkap.split(" ");
  const lastName = rest.join(" ");
  const userInitials = (authUser?.name ?? "D")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SidebarNav role="dosen" />
      <div className="flex-1 flex flex-col">

        {/* Topbar */}
        <div className="bg-blue-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
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

        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-400 dark:text-slate-500">Setting /</p>

          {/* Profil */}
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-base">Pengaturan Pengguna</h2>
              <button
                onClick={simpanPerubahan}
                disabled={saving || loading}
                className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Memuat data...</p>
            ) : (
              <>
                {/* Avatar */}
                <div className="relative w-24 h-24 mb-2">
                  <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {fotoUrl ? (
                      <img src={fotoUrl} alt="Foto profil" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-16 h-16 text-slate-400 dark:text-slate-500" fill="currentColor">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFoto}
                    title="Ubah foto profil"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 ring-2 ring-white dark:ring-slate-900"
                  >
                    <Camera size={14} />
                  </button>
                </div>

                {uploadingFoto && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Mengunggah foto...</p>
                )}
                {fotoError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mb-4">{fotoError}</p>
                )}
                {!uploadingFoto && !fotoError && <div className="mb-4" />}

                {/* Form */}
                <div className="space-y-5 max-w-sm">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nama Depan</label>
                    <input
                      value={firstName ?? ""}
                      onChange={(e) => setNamaLengkap(`${e.target.value} ${lastName}`.trim())}
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Nama Belakang</label>
                    <input
                      value={lastName ?? ""}
                      onChange={(e) => setNamaLengkap(`${firstName} ${e.target.value}`.trim())}
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {message && (
                    <div
                      className={`rounded-lg px-4 py-3 text-xs ${
                        message.type === "success"
                          ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
                          : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg px-4 py-3">
                    <Lock size={15} className="text-blue-500 dark:text-blue-300 flex-shrink-0" />
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Kami menjaga kerahasiaan data Anda dan tidak akan pernah membagikannya kepada pihak ketiga.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Ubah Password */}
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
            <h2 className="font-semibold text-base mb-1">Ubah Password</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Password minimal 12 karakter dan mengandung 1 simbol unik.
            </p>

            <form onSubmit={ubahPassword} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Password Lama</label>
                <input
                  value={passwordLama}
                  onChange={(e) => setPasswordLama(e.target.value)}
                  type="password"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Password Baru</label>
                <input
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  type="password"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Konfirmasi Password Baru</label>
                <input
                  value={passwordKonfirmasi}
                  onChange={(e) => setPasswordKonfirmasi(e.target.value)}
                  type="password"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {passwordMessage && (
                <div
                  className={`rounded-lg px-4 py-3 text-xs ${
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
                className="rounded-lg border border-blue-300 dark:border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 disabled:opacity-50"
              >
                {savingPassword ? "Menyimpan..." : "Ubah Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}