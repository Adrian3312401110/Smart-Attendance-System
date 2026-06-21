"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import SidebarMahasiswa from "../../../components/SidebarMahasiswa";

interface JadwalItem {
  id: number;
  id_dosen: string;
  id_mata_kuliah: string;
  hari: string;
  jam: string;
}

interface AbsensiResult {
  berhasil: boolean;
  pesan: string;
  nama?: string;
  confidence?: number;
  waktu?: string;
  liveness_detail?: {
    total_persen_pergeseran: number;
    jarak_per_langkah: number[];
    smoothness_ratio: number;
    ukuran_wajah_referensi: number;
  };
}

const DURASI_SESI_DETIK = 5;
const JUMLAH_FRAME = 3; // diambil tersebar selama window sesi

export default function AmbilAbsensiPage() {
  const webcamRef = useRef<Webcam>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [selectedJadwal, setSelectedJadwal] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AbsensiResult | null>(null);
  const [sesiAktif, setSesiAktif] = useState(false);
  const [sisaWaktu, setSisaWaktu] = useState(DURASI_SESI_DETIK);

  useEffect(() => {
    fetch("http://localhost:8000/jadwal")
      .then((r) => r.json())
      .then((data) => setJadwalList(data.data ?? []))
      .catch(() => {});
  }, []);

  const kirimKeServer = useCallback(
    async (frameBlobs: Blob[]) => {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("id_jadwal", selectedJadwal);
        frameBlobs.forEach((blob, i) => {
          formData.append("foto_list", blob, `frame_${i}.jpg`);
        });

        const res = await fetch("http://localhost:8000/absensi/foto", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.berhasil) {
          setResult({
            berhasil: true,
            pesan: data.pesan,
            nama: data.data?.nama,
            confidence: data.data?.confidence,
            waktu: data.data?.waktu,
            liveness_detail: data.data?.liveness_detail,
          });
        } else {
          setResult({
            berhasil: false,
            pesan: data.pesan ?? "Absensi gagal",
            confidence: data.confidence,
            liveness_detail: data.liveness_detail,
          });
        }
      } catch {
        setResult({ berhasil: false, pesan: "Tidak dapat terhubung ke server" });
      } finally {
        setLoading(false);
      }
    },
    [selectedJadwal]
  );

  const mulaiSesi = useCallback(() => {
    if (!webcamRef.current || !selectedJadwal) return;

    setResult(null);
    setSesiAktif(true);
    setSisaWaktu(DURASI_SESI_DETIK);

    const frameBlobs: Blob[] = [];
    const intervalMs = (DURASI_SESI_DETIK * 1000) / JUMLAH_FRAME;
    let frameKe = 0;

    const intervalCapture = setInterval(async () => {
      if (!webcamRef.current) return;
      const dataUrl = webcamRef.current.getScreenshot();
      if (dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        frameBlobs.push(blob);
      }
      frameKe++;

      if (frameKe >= JUMLAH_FRAME) {
        clearInterval(intervalCapture);
        clearInterval(intervalCountdown);
        setSesiAktif(false);
        kirimKeServer(frameBlobs);
      }
    }, intervalMs);

    const intervalCountdown = setInterval(() => {
      setSisaWaktu((prev) => {
        if (prev <= 1) {
          clearInterval(intervalCountdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectedJadwal, kirimKeServer]);

  return (
    <main className="min-h-screen bg-slate-100 flex">
      <SidebarMahasiswa />

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-blue-600">Mahasiswa • Presensi Kelas</p>
            <h1 className="text-3xl font-bold">Ambil Absensi</h1>
            <p className="text-sm text-slate-500">
              Lakukan absensi dengan verifikasi wajah untuk sesi kelas yang sedang aktif.
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

        <section className="bg-white rounded-2xl shadow p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Pilih Jadwal Kelas
          </label>
          <select
            value={selectedJadwal}
            onChange={(e) => setSelectedJadwal(e.target.value)}
            disabled={sesiAktif}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          >
            <option value="">-- Pilih jadwal --</option>
            {jadwalList.map((j) => (
              <option key={j.id} value={j.id}>
                {j.id_mata_kuliah} • {j.hari} {j.jam} (Dosen: {j.id_dosen})
              </option>
            ))}
          </select>
          {jadwalList.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Belum ada jadwal tersedia. Tambahkan jadwal dari sisi dosen terlebih dahulu.
            </p>
          )}
        </section>

        <section className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Verifikasi Wajah</h2>
                <p className="text-sm text-slate-500">
                  {sesiAktif
                    ? "Gerakkan wajah Anda perlahan (kiri-kanan atau atas-bawah) sampai hitung mundur selesai."
                    : "Aktifkan kamera, lalu mulai sesi absen. Anda akan diminta menggerakkan wajah selama 10 detik."}
                </p>
              </div>
              {sesiAktif && (
                <span className="h-fit rounded-full bg-orange-100 px-4 py-2 text-lg font-bold text-orange-600 tabular-nums">
                  {sisaWaktu}s
                </span>
              )}
            </div>

            <div className="relative h-80 rounded-2xl bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center text-white overflow-hidden">
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

              {sesiAktif && (
                <div className="absolute inset-0 border-4 border-orange-400 rounded-2xl pointer-events-none animate-pulse" />
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setCameraOn((v) => !v)}
                disabled={sesiAktif}
                className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-600 disabled:opacity-50"
              >
                {cameraOn ? "Matikan Kamera" : "Aktifkan Kamera"}
              </button>

              <button
                onClick={mulaiSesi}
                disabled={!cameraOn || !selectedJadwal || loading || sesiAktif}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {sesiAktif ? "Sesi Berjalan..." : loading ? "Memproses..." : "Mulai Sesi Absen"}
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Status Pemeriksaan</h2>
              <StatusRow label="Kamera" value={cameraOn ? "Siap" : "Belum Aktif"} green={cameraOn} />
              <StatusRow label="Jadwal" value={selectedJadwal ? "Dipilih" : "Belum Dipilih"} green={!!selectedJadwal} />
              <StatusRow label="Sesi" value={sesiAktif ? "Sedang Berjalan" : "Belum Dimulai"} green={sesiAktif} />
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Panduan Cepat</h2>
              <Guide number="1" text="Pilih jadwal kelas yang sedang berlangsung." />
              <Guide number="2" text="Aktifkan kamera dan posisikan wajah di tengah frame." />
              <Guide number="3" text="Tekan Mulai Sesi Absen." />
              <Guide number="4" text="Gerakkan wajah perlahan ke kiri-kanan/atas-bawah selama hitung mundur 10 detik." />
            </div>
          </aside>
        </section>

        {result && (
          <section
            className={`rounded-2xl border p-6 ${
              result.berhasil ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    result.berhasil ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  {result.berhasil ? "Absensi Berhasil" : "Absensi Gagal"}
                </span>

                <h2 className="mt-4 text-xl font-bold">
                  {result.berhasil ? `Kehadiran ${result.nama} berhasil dicatat` : result.pesan}
                </h2>

                {result.berhasil && (
                  <p className="text-sm text-slate-600 mt-1">
                    Waktu: {result.waktu} • Akurasi wajah: {((result.confidence ?? 0) * 100).toFixed(1)}%
                  </p>
                )}
                {!result.berhasil && result.confidence !== undefined && (
                  <p className="text-sm text-slate-600 mt-1">
                    Confidence tertinggi: {((result.confidence ?? 0) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>

            {result.liveness_detail && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">Detail Analisis Gerakan:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 text-center bg-white border border-slate-200">
                    <p className="text-xs text-slate-500">Total Pergeseran</p>
                    <p className="text-lg font-bold text-slate-700">
                      {result.liveness_detail.total_persen_pergeseran}%
                    </p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-white border border-slate-200">
                    <p className="text-xs text-slate-500">Smoothness Ratio</p>
                    <p className="text-lg font-bold text-slate-700">
                      {result.liveness_detail.smoothness_ratio}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function StatusRow({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          green ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"
        }`}
      >
        {value}
      </span>
    </div>
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