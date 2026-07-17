"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Webcam from "react-webcam";
import { API_URL } from "@/lib/api";

const PASSWORD_RULES = /^(?=.{12,})(?=.*[^A-Za-z0-9]).+$/;

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

const DURASI_CAPTURE_MS = 3000;
const INTERVAL_FRAME_MS = 200;

interface Sample {
  id: string;
  dataUrl: string;
  blob: Blob;
}

interface GestureChallenge {
  token: string;
  gestures: string[];
  instruksi: string[];
}

function visualGesture(instruksi: string) {
  const t = instruksi.toLowerCase();
  if (t.includes("kanan")) return { icon: "➡️", anim: "goyangKanan" };
  if (t.includes("kiri")) return { icon: "⬅️", anim: "goyangKiri" };
  if (t.includes("atas") || t.includes("naik") || t.includes("dongak")) return { icon: "⬆️", anim: "gerakAtas" };
  if (t.includes("bawah") || t.includes("turun") || t.includes("tunduk")) return { icon: "⬇️", anim: "gerakBawah" };
  if (t.includes("kedip") || t.includes("mata")) return { icon: "😉", anim: "kedipMata" };
  if (t.includes("senyum") || t.includes("mulut") || t.includes("buka")) return { icon: "😀", anim: "senyumPulse" };
  if (t.includes("angguk")) return { icon: "🙂", anim: "gerakAtas" };
  if (t.includes("geleng")) return { icon: "🙂", anim: "goyangKanan" };
  return { icon: "🙂", anim: "senyumPulse" };
}

function GestureAnimation({ instruksi }: { instruksi: string }) {
  const visual = visualGesture(instruksi);
  return (
    <div className="flex justify-center py-2">
      <style>{`
        @keyframes goyangKanan { 0%,100% { transform: rotate(0deg);} 50% { transform: rotate(22deg);} }
        @keyframes goyangKiri { 0%,100% { transform: rotate(0deg);} 50% { transform: rotate(-22deg);} }
        @keyframes gerakAtas { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-10px);} }
        @keyframes gerakBawah { 0%,100% { transform: translateY(0);} 50% { transform: translateY(10px);} }
        @keyframes kedipMata { 0%,100% { opacity: 1;} 50% { opacity: 0.25;} }
        @keyframes senyumPulse { 0%,100% { transform: scale(1);} 50% { transform: scale(1.15);} }
      `}</style>
      <span
        className="text-6xl inline-block"
        style={{ animation: `${visual.anim} 1.1s ease-in-out infinite` }}
      >
        {visual.icon}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "",
    role: "mahasiswa",
    user_id: "",
    angkatan: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);

  const [challenge, setChallenge] = useState<GestureChallenge | null>(null);
  const [gestureIndex, setGestureIndex] = useState(0);
  const [tahapan, setTahapan] = useState<"idle" | "countdown" | "capturing" | "processing" | "selesai">("idle");
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [gestureStatus, setGestureStatus] = useState<{ index: number; status: "pending" | "ok" | "gagal" }[]>([]);
  const [gestureError, setGestureError] = useState("");

  useEffect(() => {
    // Clear any existing session when opening the registration page
    localStorage.removeItem("auth_user");

    if (form.role !== "mahasiswa") {
      setSamples([]);
      setChallenge(null);
      setTahapan("idle");
      setGestureStatus([]);
      setGestureError("");
    }
  }, [form.role]);

  const jalankanGesture = useCallback(async (index: number, ch: GestureChallenge) => {
    if (!webcamRef.current) return;

    setTahapan("countdown");
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }

    setTahapan("capturing");
    setProgress(0);

    const frameBlobs: Blob[] = [];
    const totalFrame = Math.floor(DURASI_CAPTURE_MS / INTERVAL_FRAME_MS);

    for (let i = 0; i < totalFrame; i++) {
      const dataUrl = webcamRef.current?.getScreenshot();
      if (dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        frameBlobs.push(blob);
      }
      setProgress(Math.round(((i + 1) / totalFrame) * 100));
      if (i < totalFrame - 1) {
        await new Promise((r) => setTimeout(r, INTERVAL_FRAME_MS));
      }
    }

    setTahapan("processing");

    const formData = new FormData();
    formData.append("gesture_token", ch.token);
    formData.append("gesture_index", String(index));
    frameBlobs.forEach((blob, i) => formData.append("foto_list", blob, `frame_${i}.jpg`));

    try {
      const res = await fetch(`${API_URL}/liveness/verifikasi-gesture`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.berhasil) {
        setGestureStatus((prev) => prev.map((g) => (g.index === index ? { ...g, status: "gagal" } : g)));
        setGestureError(data.pesan ?? "Gesture tidak terdeteksi, silakan ulangi dari awal");
        setTahapan("idle");
        setChallenge(null);
        return;
      }

      setGestureStatus((prev) => prev.map((g) => (g.index === index ? { ...g, status: "ok" } : g)));

      const frameTerakhir = frameBlobs[frameBlobs.length - 1];
      const dataUrl = URL.createObjectURL(frameTerakhir);
      setSamples((prev) => [
        ...prev,
        { id: `${form.user_id || "mahasiswa"}_gesture_${index}_${Date.now()}`, dataUrl, blob: frameTerakhir },
      ]);

      if (data.selesai) {
        setTahapan("selesai");
        setChallenge(null);
      } else {
        const nextIndex = index + 1;
        setGestureIndex(nextIndex);
        jalankanGesture(nextIndex, ch);
      }
    } catch {
      setGestureError("Tidak dapat terhubung ke server");
      setTahapan("idle");
      setChallenge(null);
    }
  }, [form.user_id]);

  async function mulaiRegistrasiWajah() {
    if (!cameraOn || form.role !== "mahasiswa") return;

    setGestureError("");
    setSamples([]);
    setGestureIndex(0);

    try {
      const res = await fetch(`${API_URL}/liveness/gesture-challenge-registrasi`);
      const data = await res.json();
      setChallenge(data);
      setGestureStatus(data.gestures.map((_: string, i: number) => ({ index: i, status: "pending" })));
      jalankanGesture(0, data);
    } catch {
      setGestureError("Tidak dapat terhubung ke server");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!PASSWORD_RULES.test(form.password)) {
      setError("Password minimal 12 karakter dan mengandung 1 simbol unik.");
      setLoading(false);
      return;
    }

    if (form.role === "mahasiswa" && samples.length < 3) {
      setError("Selesaikan proses registrasi wajah (3 gesture) sebelum mendaftarkan akun mahasiswa.");
      setLoading(false);
      return;
    }

    try {
      if (form.role === "mahasiswa") {
        const formData = new FormData();
        formData.append("nama", form.nama);
        formData.append("email", form.email);
        formData.append("password", form.password);
        formData.append("role", form.role);
        formData.append("user_id", form.user_id);
        formData.append("angkatan", form.angkatan);

        samples.forEach((sample, index) => {
          formData.append("foto_list", sample.blob, `sample_${index + 1}.jpg`);
        });

        const res = await fetch(`${API_URL}/auth/register-with-face`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok || !data.berhasil) {
          throw new Error(data.pesan || "Registrasi gagal");
        }

        setSuccess("Akun dan registrasi wajah berhasil dibuat. Silakan masuk.");
        setTimeout(() => router.push("/auth/login"), 900);
        return;
      }

      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, angkatan: undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.berhasil) {
        throw new Error(data.pesan || "Registrasi gagal");
      }

      setSuccess("Akun berhasil dibuat. Silakan masuk.");
      setTimeout(() => router.push("/auth/login"), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  }

  const instruksiAktif = challenge?.instruksi[gestureIndex] ?? "";
  const progressGesture = challenge ? `${gestureIndex + 1} / ${challenge.gestures.length}` : "";
  const sedangProses = tahapan === "countdown" || tahapan === "capturing" || tahapan === "processing";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Smart Attendance System</p>
          <h1 className="mt-2 text-2xl font-bold">Buat Akun Baru</h1>
          <p className="mt-2 text-sm text-blue-100">
            Daftarkan akun Anda. Jika memilih mahasiswa, registrasi wajah dengan verifikasi gesture wajib dilakukan sebelum akun selesai dibuat.
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nama Lengkap</label>
                <input
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Nama"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Peran</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="mahasiswa">Mahasiswa</option>
                  <option value="dosen">Dosen</option>
                </select>
              </div>
            </div>

            <div className={`grid gap-4 ${form.role === "mahasiswa" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {form.role === "mahasiswa" ? "NIM" : "NIK"}
                </label>
                <input
                  required
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={form.role === "mahasiswa" ? "3312xxxxxx" : "contoh: 12345678"}
                />
              </div>
              {form.role === "mahasiswa" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Angkatan</label>
                  <input
                    value={form.angkatan}
                    onChange={(e) => setForm({ ...form, angkatan: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="2024"
                  />
                </div>
              )}
            </div>

            {form.role === "mahasiswa" ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Registrasi Wajah (Verifikasi Gesture)</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Ikuti 3 instruksi gesture acak. Setiap gesture yang berhasil terverifikasi otomatis menjadi sampel wajah.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-600">
                    {samples.length}/3
                  </span>
                </div>

                {challenge && tahapan !== "selesai" && (
                  <div className="mt-4 rounded-xl bg-white border border-blue-200 p-4 text-center">
                    <p className="text-xs text-blue-500 font-semibold mb-1">Gesture {progressGesture}</p>
                    <p className="text-xl font-bold text-blue-700">{instruksiAktif}</p>
                    <GestureAnimation instruksi={instruksiAktif} />
                    {tahapan === "countdown" && (
                      <p className="text-4xl font-black text-blue-600 mt-1">{countdown}</p>
                    )}
                    {tahapan === "capturing" && (
                      <div className="mt-2">
                        <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-blue-500 mt-1">Merekam... {progress}%</p>
                      </div>
                    )}
                    {tahapan === "processing" && (
                      <p className="text-sm text-blue-500 mt-2 animate-pulse">Memverifikasi gesture...</p>
                    )}
                  </div>
                )}

                {challenge && (
                  <div className="flex gap-2 mt-4">
                    {challenge.gestures.map((g, i) => {
                      const st = gestureStatus.find((s) => s.index === i)?.status ?? "pending";
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-xl p-2 text-center text-xs font-semibold border ${
                            st === "ok" ? "bg-green-100 border-green-300 text-green-700" :
                            st === "gagal" ? "bg-red-100 border-red-300 text-red-700" :
                            i === gestureIndex ? "bg-blue-100 border-blue-300 text-blue-700" :
                            "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                        >
                          {st === "ok" ? "✓" : st === "gagal" ? "✗" : `${i + 1}`}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 overflow-hidden rounded-2xl bg-slate-900 relative">
                  {cameraOn ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/jpeg"
                      className="w-full aspect-video object-cover"
                      videoConstraints={VIDEO_CONSTRAINTS}
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-sm text-blue-100">
                      Kamera belum aktif
                    </div>
                  )}
                  {tahapan === "countdown" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-7xl font-black text-white drop-shadow-lg">{countdown}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setCameraOn((v) => !v)}
                    disabled={sedangProses}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {cameraOn ? "Matikan Kamera" : "Aktifkan Kamera"}
                  </button>
                  <button
                    type="button"
                    onClick={mulaiRegistrasiWajah}
                    disabled={!cameraOn || sedangProses}
                    className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
                  >
                    {samples.length > 0 || gestureError ? "Ulangi Registrasi Wajah" : "Mulai Registrasi Wajah"}
                  </button>
                </div>

                {gestureError ? <p className="mt-3 text-sm text-red-600">{gestureError}</p> : null}

                {samples.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {samples.map((sample, index) => (
                      <div key={sample.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <img src={sample.dataUrl} alt={`Sampel ${index + 1}`} className="h-32 w-full rounded-lg object-cover" />
                        <p className="mt-2 text-sm font-medium text-slate-700">Sampel {index + 1} (Gesture {index + 1})</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="text-sm text-slate-500">Password minimal 12 karakter dan mengandung 1 simbol unik.</p>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-green-600">{success}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Memproses..." : form.role === "mahasiswa" ? "Daftar & Simpan Wajah" : "Daftar"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-500">
            Sudah punya akun? <Link href="/auth/login" className="font-semibold text-blue-600">Masuk</Link>
          </p>
        </div>
      </div>
    </main>
  );
}