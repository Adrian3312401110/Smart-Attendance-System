"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import Webcam from "react-webcam";

const NIM = "3312401110"; // TODO: ganti dengan id mahasiswa dari sesi login

  const menu = [
  { label: "Dashboard", href: "/mahasiswa" },
  { label: "Gabung Kelas", href: "/mahasiswa/gabung-kelas" },
  { label: "Registrasi Wajah", href: "/mahasiswa/registrasi-wajah" },
  { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi" },
  { label: "Riwayat Mahasiswa", href: "/mahasiswa/riwayat" },
  { label: "Profile", href: "/mahasiswa/profile" },
];

interface Sample {
  id: string;
  dataUrl: string;
  status: "uploading" | "tersimpan" | "gagal";
  pesan?: string;
}

export default function RegistrasiWajahPage() {
  const webcamRef = useRef<Webcam>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);

  const ambilSampel = useCallback(async () => {
    if (!webcamRef.current) return;
    const dataUrl = webcamRef.current.getScreenshot();
    if (!dataUrl) return;

    const idFoto = `${NIM}_${Date.now()}`;
    const sampleBaru: Sample = { id: idFoto, dataUrl, status: "uploading" };
    setSamples((prev) => [...prev, sampleBaru]);
    setLoading(true);

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("id_mahasiswa", NIM);
      formData.append("id_foto", idFoto);
      formData.append("foto", blob, `${idFoto}.jpg`);

      const res = await fetch("http://localhost:8000/mahasiswa/daftar-wajah", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      setSamples((prev) =>
        prev.map((s) =>
          s.id === idFoto
            ? { ...s, status: data.berhasil ? "tersimpan" : "gagal", pesan: data.pesan }
            : s
        )
      );
    } catch {
      setSamples((prev) =>
        prev.map((s) => (s.id === idFoto ? { ...s, status: "gagal", pesan: "Tidak dapat terhubung ke server" } : s))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function resetSampel() {
    setSamples([]);
  }

  const tersimpanCount = samples.filter((s) => s.status === "tersimpan").length;

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
                item.href === "/mahasiswa/registrasi-wajah"
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
        <header className="mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-blue-600">Mahasiswa • Verifikasi Biometrik</p>
            <h1 className="text-3xl font-bold">Registrasi Wajah</h1>
            <p className="text-sm text-slate-500">
              Daftarkan wajah Anda untuk mendukung proses absensi yang cepat, aman, dan akurat.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl shadow px-5 py-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              M
            </div>
            <div>
              <p className="font-bold">Mikaa</p>
              <p className="text-sm text-slate-500">TI-4A • Teknik Informatika</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Preview Kamera</h2>
                <p className="text-sm text-slate-500">
                  Arahkan wajah Anda ke dalam frame dan ambil beberapa sampel wajah.
                </p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full h-fit">
                {cameraOn ? "Live Camera" : "Kamera Mati"}
              </span>
            </div>

            <div className="h-80 bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl flex items-center justify-center relative text-white overflow-hidden">
              {cameraOn ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="absolute inset-0 w-full h-full object-cover"
                  videoConstraints={{ facingMode: "user" }}
                />
              ) : (
                <p className="text-sm text-blue-200">Kamera belum aktif</p>
              )}

              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3 z-10">
                <InfoBox title="Status Kamera" value={cameraOn ? "Aktif" : "Nonaktif"} />
                <InfoBox title="Sampel Tersimpan" value={`${tersimpanCount}`} />
                <InfoBox title="Total Diambil" value={`${samples.length}`} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCameraOn((v) => !v)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm"
              >
                {cameraOn ? "Matikan Kamera" : "Aktifkan Kamera"}
              </button>
              <button
                onClick={ambilSampel}
                disabled={!cameraOn || loading}
                className="border border-blue-300 text-blue-600 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Ambil Sampel"}
              </button>
              <button
                onClick={resetSampel}
                className="border border-red-300 text-red-500 px-4 py-2 rounded-xl font-bold text-sm"
              >
                Reset
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Status Registrasi</h2>
              <StatusRow label="Status Akun" value="Mahasiswa Aktif" />
              <StatusRow
                label="Registrasi Wajah"
                value={tersimpanCount >= 3 ? "Selesai" : "Belum Selesai"}
                yellow={tersimpanCount < 3}
              />
              <StatusRow label="Sampel Tersimpan" value={`${tersimpanCount} / 3`} />
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Panduan</h2>
              <Guide number="1" text="Pastikan wajah terlihat jelas dan berada di tengah frame." />
              <Guide number="2" text="Gunakan pencahayaan yang cukup dan hindari backlight." />
              <Guide number="3" text="Lepaskan masker, topi, atau benda yang menutupi wajah." />
              <Guide number="4" text="Ambil minimal 3 sampel sebelum menyelesaikan registrasi." />
            </div>
          </aside>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Sampel Wajah</h2>
              <p className="text-sm text-slate-500">
                Pastikan minimal tiga sampel wajah berhasil tersimpan.
              </p>
            </div>
          </div>

          {samples.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada sampel diambil.</p>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {samples.map((s, i) => (
                <SampleCard key={s.id} index={i + 1} sample={s} />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl p-3">
      <p className="text-xs text-blue-100">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function StatusRow({ label, value, yellow = false }: { label: string; value: string; yellow?: boolean }) {
  return (
    <div className="flex justify-between mb-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          yellow ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-600"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Guide({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3 bg-blue-50 rounded-xl p-3 mb-3 text-sm">
      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
        {number}
      </span>
      <p>{text}</p>
    </div>
  );
}

function SampleCard({ index, sample }: { index: number; sample: Sample }) {
  const statusLabel =
    sample.status === "tersimpan" ? "Tersimpan" : sample.status === "uploading" ? "Memproses" : "Gagal";

  const statusColor =
    sample.status === "tersimpan"
      ? "bg-green-100 text-green-600"
      : sample.status === "uploading"
      ? "bg-slate-100 text-slate-500"
      : "bg-red-100 text-red-600";

  return (
    <div className="border rounded-2xl p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sample.dataUrl} alt={`Sampel ${index}`} className="h-44 w-full object-cover rounded-xl mb-4" />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">Sampel {index}</h3>
          <p className="text-sm text-slate-500">{sample.pesan ?? "Wajah depan"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>{statusLabel}</span>
      </div>
    </div>
  );
}