"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import SidebarNav from "@/components/SidebarNav";

interface JadwalItem {
  id: number;
  id_dosen: string;
  id_kelas: number | null;
  id_mata_kuliah: string;
  hari: string;
  jam: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  aktif: boolean;
  daftar_jam_absensi: string[];
  toleransi_telat_menit: number;
  mode_absensi: string;
}

interface KelasItem {
  id: number;
  nama: string;
  id_dosen: string;
}

interface GestureChallenge {
  token: string;
  gestures: string[];
  instruksi: string[];
}

interface AbsensiResult {
  berhasil: boolean;
  pesan: string;
  nama?: string;
  confidence?: number;
  waktu?: string;
  status?: string;
  telatTeks?: string;
  hariSelesai?: boolean; // false = sesi ini selesai tapi masih ada sesi lain hari ini yang belum
}

const DURASI_CAPTURE_MS = 3000;
const INTERVAL_FRAME_MS = 200;

// Daftar hari sesuai urutan JS Date.getDay(): 0=Minggu ... 6=Sabtu
const DAFTAR_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function hariIniLabel(): string {
  return DAFTAR_HARI[new Date().getDay()];
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

// Bunyikan notifikasi 2-nada menggunakan Web Audio API (tidak perlu file suara eksternal)
function bunyikanNotifikasi() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [{ freq: 880, start: 0 }, { freq: 1200, start: 0.45 }].forEach(({ freq, start }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.4);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.4);
    });
  } catch { /* Abaikan jika browser tidak mendukung */ }
}

// Hitung status waktu absensi untuk satu jadwal (di sisi klien)
// PENTING: sesi hanya dianggap "bisa" begitu now >= jam_target — TIDAK ADA
// jendela lebih awal, supaya konsisten dengan validasi di backend.
function hitungStatusWaktu(jadwal: JadwalItem): {
  bisa: boolean;
  hari_cocok: boolean;
  terlalu_awal: boolean;
  sudah_lewat: boolean;
  jam_berikutnya: string | null;
  menit_sampai: number | null;
} {
  const hariSekarang = hariIniLabel();
  const hariCocok = jadwal.hari === hariSekarang;

  if (!hariCocok) {
    return { bisa: false, hari_cocok: false, terlalu_awal: false, sudah_lewat: false, jam_berikutnya: null, menit_sampai: null };
  }

  const now = new Date();
  const nowMenit = now.getHours() * 60 + now.getMinutes();
  const daftarJam = jadwal.daftar_jam_absensi ?? [];

  if (daftarJam.length === 0) {
    return { bisa: false, hari_cocok: true, terlalu_awal: false, sudah_lewat: false, jam_berikutnya: null, menit_sampai: null };
  }

  const toMenit = (jamStr: string) => {
    const [h, m] = jamStr.split(":").map(Number);
    return h * 60 + m;
  };

  const jamSelesaiMenit = jadwal.jam_selesai ? toMenit(jadwal.jam_selesai) : null;

  let bisa = false;
  let sudahLewatSemua = true;
  let jam_berikutnya: string | null = null;
  let menit_sampai: number | null = null;

  for (let i = 0; i < daftarJam.length; i++) {
    const targetMenit = toMenit(daftarJam[i]);
    let batasMenit: number;
    if (i + 1 < daftarJam.length) {
      batasMenit = toMenit(daftarJam[i + 1]);
    } else if (jamSelesaiMenit !== null && jamSelesaiMenit > targetMenit) {
      batasMenit = jamSelesaiMenit;
    } else {
      batasMenit = targetMenit + 120;
    }

    if (nowMenit >= targetMenit && nowMenit < batasMenit) {
      bisa = true;
      sudahLewatSemua = false;
      break;
    }
    if (nowMenit < targetMenit) {
      sudahLewatSemua = false;
      if (jam_berikutnya === null || (targetMenit - nowMenit) < (menit_sampai ?? Infinity)) {
        jam_berikutnya = daftarJam[i];
        menit_sampai = targetMenit - nowMenit;
      }
    }
  }

  return { bisa, hari_cocok: true, terlalu_awal: !bisa && jam_berikutnya !== null, sudah_lewat: sudahLewatSemua, jam_berikutnya, menit_sampai };
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

export default function AmbilAbsensiPage() {
  const [lokasi, setLokasi] = useState<{lat: number; lon: number; accuracy: number; altitude: number | null;} | null>(null);
  const [lokasiError, setLokasiError] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [selectedJadwal, setSelectedJadwal] = useState<string>("");
  const [jadwalTerpilih, setJadwalTerpilih] = useState<JadwalItem | null>(null);
  const [showPilihJadwal, setShowPilihJadwal] = useState(true);
  const [result, setResult] = useState<AbsensiResult | null>(null);

  const [challenge, setChallenge] = useState<GestureChallenge | null>(null);
  const [gestureIndex, setGestureIndex] = useState(0);
  const [tahapan, setTahapan] = useState<"idle" | "countdown" | "capturing" | "processing" | "selesai">("idle");
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [gestureStatus, setGestureStatus] = useState<{ index: number; status: "pending" | "ok" | "gagal" }[]>([]);

  // Status waktu absensi real-time & notifikasi
  const [statusWaktu, setStatusWaktu] = useState<ReturnType<typeof hitungStatusWaktu> | null>(null);
  const [notifBanner, setNotifBanner] = useState<string | null>(null);
  const sudahNotifRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) {
      window.location.href = "/auth/login";
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "mahasiswa") {
      window.location.href = "/dosen";
      return;
    }

    setUser(parsedUser);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    async function muatJadwalKelasSaya() {
      setLoadingJadwal(true);
      try {
        // Ambil semua kelas yang ada
        const resKelas = await fetch("http://localhost:8000/kelas");
        const dataKelas = await resKelas.json();
        const semuaKelas: KelasItem[] = dataKelas.data ?? [];

        // Cek per kelas apakah mahasiswa ini sudah "approved" jadi anggotanya
        const idKelasDiikuti: number[] = [];
        await Promise.all(
          semuaKelas.map(async (k) => {
            try {
              const resAnggota = await fetch(
                `http://localhost:8000/kelas/${k.id}/anggota?status=approved`
              );
              const dataAnggota = await resAnggota.json();
              const anggotaList: { id_mahasiswa: string }[] = dataAnggota.data ?? [];
              const sudahIkut = anggotaList.some((a) => a.id_mahasiswa === user?.id);
              if (sudahIkut) {
                idKelasDiikuti.push(k.id);
              }
            } catch {
              // abaikan kelas yang gagal dicek
            }
          })
        );

        if (idKelasDiikuti.length === 0) {
          setJadwalList([]);
          return;
        }

        // Ambil semua jadwal, lalu filter hanya jadwal dari kelas yang sudah diikuti
        const resJadwal = await fetch("http://localhost:8000/jadwal");
        const dataJadwal = await resJadwal.json();
        const semuaJadwal: JadwalItem[] = dataJadwal.data ?? [];

        const jadwalTerfilter = semuaJadwal.filter(
          (j) => j.id_kelas !== null && idKelasDiikuti.includes(j.id_kelas)
        );

        setJadwalList(jadwalTerfilter);
      } catch {
        setJadwalList([]);
      } finally {
        setLoadingJadwal(false);
      }
    }

    muatJadwalKelasSaya();
  }, [user]);

  // ===== Polling status waktu real-time & notifikasi bunyi =====
  useEffect(() => {
    if (!jadwalTerpilih) {
      setStatusWaktu(null);
      return;
    }

    function periksaWaktu() {
      if (!jadwalTerpilih) return;
      const sw = hitungStatusWaktu(jadwalTerpilih);
      setStatusWaktu(sw);

      // Notifikasi bunyi hanya dipasang jika hari ini memang jadwalnya
      if (!sw.hari_cocok) return;

      // Deteksi momen tepat saat jendela absensi baru terbuka (dalam 1 menit terakhir)
      const now = new Date();
      const nowMenit = now.getHours() * 60 + now.getMinutes();
      for (const jamStr of jadwalTerpilih.daftar_jam_absensi) {
        const [h, m] = jamStr.split(":").map(Number);
        const targetMenit = h * 60 + m;
        const selisih = nowMenit - targetMenit;
        const kunciNotif = `${jadwalTerpilih.id}-${jamStr}-${now.toDateString()}`;
        if (selisih >= 0 && selisih <= 1 && !sudahNotifRef.current.has(kunciNotif)) {
          sudahNotifRef.current.add(kunciNotif);
          bunyikanNotifikasi();
          setNotifBanner(`🔔 Sesi absensi ${jadwalTerpilih.id_mata_kuliah} sudah dibuka! Segera absen.`);
          setTimeout(() => setNotifBanner(null), 12000);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`Absensi ${jadwalTerpilih.id_mata_kuliah}`, {
              body: `Sesi absensi sudah dibuka! Segera lakukan absensi.`,
              icon: "/favicon.ico",
            });
          }
        }
      }
    }

    periksaWaktu();
    const timer = setInterval(periksaWaktu, 30000);
    return () => clearInterval(timer);
  }, [jadwalTerpilih]);

  // Minta izin notifikasi browser
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function pilihJadwal(j: JadwalItem) {
    setSelectedJadwal(String(j.id));
    setJadwalTerpilih(j);
    setShowPilihJadwal(false);
    sudahNotifRef.current = new Set();
  }

  function gantiJadwal() {
    setSelectedJadwal("");
    setJadwalTerpilih(null);
    setResult(null);
    setShowPilihJadwal(true);
    setStatusWaktu(null);
    setNotifBanner(null);
  }

  function ambilLokasi(): Promise<{ lat: number; lon: number; accuracy: number; altitude: number | null }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        });
      },
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

  async function mulaiSesi() {
  const userId = user?.id;
  if (!selectedJadwal || !cameraOn || !userId) return;

  // ===== Validasi hari + waktu di sisi klien sebelum memulai gesture =====
  if (jadwalTerpilih) {
    const sw = hitungStatusWaktu(jadwalTerpilih);

    if (!sw.hari_cocok) {
      setResult({
        berhasil: false,
        pesan: `📅 Jadwal ini hanya berlaku pada hari ${jadwalTerpilih.hari}, bukan hari ini (${hariIniLabel()}).`,
      });
      return;
    }

    if (jadwalTerpilih.daftar_jam_absensi.length > 0 && !sw.bisa) {
      const pesan = sw.terlalu_awal && sw.jam_berikutnya && sw.menit_sampai !== null
        ? `⏰ Belum waktunya absensi. Sesi berikutnya dibuka dalam ${sw.menit_sampai} menit lagi.`
        : "Tidak ada sesi absensi yang aktif untuk jadwal ini saat ini.";
      setResult({ berhasil: false, pesan });
      return;
    }
  }

  setResult(null);
  setLokasiError("");
  setGestureIndex(0);
  setGestureStatus([]);

  let loc;
  try {
    loc = await ambilLokasi();
    setLokasi(loc);
  } catch (err) {
    setLokasiError(err instanceof Error ? err.message : "Gagal mengambil lokasi GPS");
    setResult({ berhasil: false, pesan: "Aktifkan izin lokasi (GPS) untuk melanjutkan absensi." });
    return;
  }

  const res = await fetch(`http://localhost:8000/liveness/gesture-challenge?id_jadwal=${selectedJadwal}`);
  const data = await res.json();

  if (!res.ok || data.berhasil === false) {
    setResult({ berhasil: false, pesan: data.pesan ?? "Gagal memulai sesi absensi" });
    return;
  }

  setChallenge(data);
  setGestureStatus(data.gestures.map((_: string, i: number) => ({ index: i, status: "pending" })));

  mulaiGesture(0, data, loc);
}

  const mulaiGesture = useCallback(async (
  index: number,
  ch: GestureChallenge,
  loc: { lat: number; lon: number; accuracy: number; altitude: number | null }
) => {
  const userId = user?.id;
  if (!webcamRef.current || !userId) return;

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
  formData.append("id_jadwal", selectedJadwal);
  formData.append("id_mahasiswa", userId);
  formData.append("gesture_token", ch.token);
  formData.append("gesture_index", String(index));
  formData.append("latitude", String(loc.lat));
  formData.append("longitude", String(loc.lon));
  formData.append("accuracy", String(loc.accuracy));
  if (loc.altitude !== null) {
    formData.append("altitude", String(loc.altitude));
  }
  frameBlobs.forEach((blob, i) => {
    formData.append("foto_list", blob, `frame_${i}.jpg`);
  });

  try {
    const res = await fetch("http://localhost:8000/absensi/foto", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!res.ok || !data.berhasil) {
      setGestureStatus((prev) =>
        prev.map((g) => (g.index === index ? { ...g, status: "gagal" } : g))
      );
      setResult({ berhasil: false, pesan: data.pesan ?? "Gesture tidak terdeteksi, silakan coba lagi" });
      setTahapan("idle");
      setChallenge(null);
      return;
    }

    setGestureStatus((prev) =>
      prev.map((g) => (g.index === index ? { ...g, status: "ok" } : g))
    );

    if (data.selesai) {
      // "selesai" berarti PUTARAN GESTURE kali ini rampung. Bisa jadi ini baru
      // 1 dari beberapa sesi absensi hari ini (hari_selesai === false),
      // atau memang absensi hari ini sudah lengkap (hari_selesai === true).
      setResult({
        berhasil: true,
        pesan: data.pesan,
        nama: data.data?.nama,
        confidence: data.data?.confidence,
        waktu: data.data?.waktu,
        status: data.data?.status,
        telatTeks: data.data?.telat_teks,
        hariSelesai: data.hari_selesai ?? true,
      });
      setTahapan("selesai");
      setChallenge(null);
    } else {
      const nextIndex = data.gesture_berikutnya;
      setGestureIndex(nextIndex);
      mulaiGesture(nextIndex, ch, loc);
    }
  } catch {
    setResult({ berhasil: false, pesan: "Tidak dapat terhubung ke server" });
    setTahapan("idle");
    setChallenge(null);
  }
}, [selectedJadwal, user]);

  const instruksiAktif = challenge?.instruksi[gestureIndex] ?? "";
  const progressGesture = challenge ? `${gestureIndex + 1} / ${challenge.gestures.length}` : "";

  if (showPilihJadwal) {
    return (
      <main className="min-h-screen bg-background text-foreground flex">
        <SidebarNav role="mahasiswa" />
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow p-8">
            <h1 className="text-2xl font-bold mb-1">Pilih Jadwal Kelas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Pilih jadwal yang sesuai untuk memulai sesi absensi. Hanya jadwal dari kelas yang sudah Anda ikuti yang akan tampil di sini. Hari ini: <strong>{hariIniLabel()}</strong>
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {loadingJadwal && (
                <p className="text-sm text-slate-400 text-center py-6">Memuat jadwal...</p>
              )}
              {!loadingJadwal && jadwalList.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">
                  Anda belum bergabung ke kelas manapun, atau belum ada jadwal aktif untuk kelas Anda.
                </p>
              )}
              {jadwalList.map((j) => {
                const swj = hitungStatusWaktu(j);
                return (
                  <button
                    key={j.id}
                    onClick={() => j.aktif && pilihJadwal(j)}
                    disabled={!j.aktif}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      j.aktif
                        ? swj.bisa
                          ? "border-green-400 bg-green-50 dark:bg-green-950/30 hover:border-green-500"
                          : "border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        : "border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{j.id_mata_kuliah}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{j.hari} • {j.jam} • Dosen: {j.id_dosen}</p>
                        {j.daftar_jam_absensi?.length > 0 && (
                          <p className="text-xs text-blue-500 mt-1">
                            {j.mode_absensi === "acak"
                              ? `🎲 ${j.daftar_jam_absensi.length} sesi absensi acak per pertemuan`
                              : `Jam absensi: ${j.daftar_jam_absensi.join(", ")}`}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!j.aktif && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2 py-1 rounded-full">Nonaktif</span>
                        )}
                        {j.aktif && !swj.hari_cocok && (
                          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-full">Bukan hari ini</span>
                        )}
                        {j.aktif && swj.hari_cocok && swj.bisa && (
                          <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded-full animate-pulse">● Buka Sekarang</span>
                        )}
                        {j.aktif && swj.hari_cocok && !swj.bisa && swj.terlalu_awal && swj.jam_berikutnya && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-full">{swj.menit_sampai} mnt lagi</span>
                        )}
                        {j.aktif && swj.hari_cocok && swj.sudah_lewat && (
                          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-full">Sudah ditutup</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex">
      <SidebarNav role="mahasiswa" />

      <section className="flex-1 p-8">

        {/* Banner notifikasi bunyi */}
        {notifBanner && (
          <div className="mb-4 rounded-xl bg-green-600 text-white px-5 py-3 flex items-center justify-between shadow-lg">
            <span className="font-semibold text-sm">{notifBanner}</span>
            <button onClick={() => setNotifBanner(null)} className="ml-4 text-white/80 hover:text-white text-xl font-bold leading-none">×</button>
          </div>
        )}

        {/* Banner jika hari tidak cocok */}
        {statusWaktu && !statusWaktu.hari_cocok && jadwalTerpilih && (
          <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 flex items-center gap-3">
            <span className="text-xl">📅</span>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Bukan hari jadwal ini</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jadwal <strong>{jadwalTerpilih.id_mata_kuliah}</strong> hanya berlaku pada hari <strong>{jadwalTerpilih.hari}</strong>. Hari ini adalah <strong>{hariIniLabel()}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Banner status waktu absensi */}
        {statusWaktu?.hari_cocok && !statusWaktu.bisa && statusWaktu.sudah_lewat && (
  <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 flex items-center gap-3">
    <span className="text-xl">🔒</span>
    <div>
      <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Sesi absensi sudah ditutup</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Jendela absensi untuk jadwal ini hari ini sudah berakhir.</p>
    </div>
  </div>
)}
        {statusWaktu?.hari_cocok && statusWaktu?.bisa && (
          <div className="mb-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-5 py-3 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-green-700 dark:text-green-300 text-sm">Absensi sudah bisa dilakukan sekarang!</p>
          </div>
        )}

        <header className="mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Mahasiswa • Presensi Kelas</p>
            <h1 className="text-3xl font-bold">Ambil Absensi</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {jadwalTerpilih?.id_mata_kuliah} • {jadwalTerpilih?.hari} {jadwalTerpilih?.jam}
              <button onClick={gantiJadwal} className="ml-2 text-blue-600 font-semibold underline">Ganti jadwal</button>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-card text-card-foreground border border-border rounded-2xl shadow px-5 py-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">M</div>
            <div>
              <p className="font-bold">{user?.name ?? "Mahasiswa"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.id ?? "-"}</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-card text-card-foreground border border-border rounded-2xl shadow p-6">

            {challenge && tahapan !== "selesai" && (
              <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-4 text-center">
                <p className="text-xs text-blue-500 dark:text-blue-300 font-semibold mb-1">Gesture {progressGesture}</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{instruksiAktif}</p>
                <GestureAnimation instruksi={instruksiAktif} />
                {tahapan === "countdown" && (
                  <p className="text-5xl font-black text-blue-600 dark:text-blue-400 mt-2">{countdown}</p>
                )}
                {tahapan === "capturing" && (
                  <div className="mt-2">
                    <div className="h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Merekam... {progress}%</p>
                  </div>
                )}
                {tahapan === "processing" && (
                  <p className="text-sm text-blue-500 dark:text-blue-300 mt-2 animate-pulse">Menganalisis gesture...</p>
                )}
              </div>
            )}

            {!challenge && tahapan === "idle" && (
              <div className="mb-4">
                <h2 className="text-xl font-bold">Verifikasi Wajah</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Sistem akan meminta beberapa gesture acak. Ikuti instruksi yang ditampilkan.
                </p>
              </div>
            )}

            {challenge && (
              <div className="flex gap-2 mb-4">
                {challenge.gestures.map((g, i) => {
                  const st = gestureStatus.find((s) => s.index === i)?.status ?? "pending";
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-xl p-3 text-center text-xs font-semibold border ${
                        st === "ok" ? "bg-green-100 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300" :
                        st === "gagal" ? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300" :
                        i === gestureIndex ? "bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300" :
                        "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {st === "ok" ? "✓" : st === "gagal" ? "✗" : `${i + 1}`}
                      <br />
                      <span className="text-[10px]">{challenge.instruksi[i].split(" ").slice(1).join(" ")}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative w-full aspect-video rounded-2xl bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center text-white overflow-hidden">
              {cameraOn ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  className="absolute inset-0 w-full h-full object-cover"
                  videoConstraints={VIDEO_CONSTRAINTS}
                />
              ) : (
                <p className="text-sm text-blue-200">Kamera belum aktif</p>
              )}
              {tahapan === "countdown" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                  <span className="text-8xl font-black text-white drop-shadow-lg">{countdown}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setCameraOn((v) => !v)}
                disabled={tahapan !== "idle" && tahapan !== "selesai"}
                className="rounded-xl border border-blue-300 dark:border-blue-700 px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 disabled:opacity-50"
              >
                {cameraOn ? "Matikan Kamera" : "Aktifkan Kamera"}
              </button>

              <button
                onClick={mulaiSesi}
                disabled={!cameraOn || !selectedJadwal || (tahapan !== "idle" && tahapan !== "selesai")}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {tahapan === "idle" || tahapan === "selesai" ? "Mulai Absensi" : "Sedang Berjalan..."}
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-card text-card-foreground border border-border rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Status</h2>
              <StatusRow label="Kamera" value={cameraOn ? "Siap" : "Belum Aktif"} green={cameraOn} />
              <StatusRow label="Jadwal" value={jadwalTerpilih?.id_mata_kuliah ?? "-"} green={!!selectedJadwal} />
              <StatusRow
                label="Sesi"
                value={
                  tahapan === "idle" ? "Belum Dimulai" :
                  tahapan === "countdown" ? `Gesture ${gestureIndex + 1} — Bersiap...` :
                  tahapan === "capturing" ? `Gesture ${gestureIndex + 1} — Merekam` :
                  tahapan === "processing" ? "Menganalisis..." :
                  "Selesai"
                }
                green={tahapan === "selesai"}
              />
              <StatusRow
                label="Waktu Absensi"
                value={
                  !statusWaktu ? "-" :
                  !statusWaktu.hari_cocok ? "Bukan hari ini" :
                  statusWaktu.bisa ? "Buka Sekarang" :
                  statusWaktu.terlalu_awal ? `${statusWaktu.menit_sampai} mnt lagi` :
                  "Tidak ada sesi"
                }
                green={statusWaktu?.hari_cocok === true && (statusWaktu?.bisa ?? false)}
              />
            </div>

            {jadwalTerpilih?.daftar_jam_absensi?.length ? (
              <div className="bg-card text-card-foreground border border-border rounded-2xl shadow p-6">
                <h2 className="text-lg font-bold mb-3">Jam Absensi</h2>
                {jadwalTerpilih.mode_absensi === "acak" ? (
                  <p className="text-xs text-slate-400">
                    🎲 Sistem memilih {jadwalTerpilih.daftar_jam_absensi.length} waktu absensi secara acak
                    selama jam kelas. Waktunya dirahasiakan — perhatikan notifikasi/banner di halaman ini
                    saat sesi absensi dibuka.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {jadwalTerpilih.daftar_jam_absensi.map((jam) => {
                        const hariCocok = jadwalTerpilih.hari === hariIniLabel();
                        const now = new Date();
                        const nowMenit = now.getHours() * 60 + now.getMinutes();
                        const [h, m] = jam.split(":").map(Number);
                        const targetMenit = h * 60 + m;
                        const selisih = nowMenit - targetMenit;
                        const jamAktif = hariCocok && selisih >= 0;
                        return (
                          <span
                            key={jam}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              jamAktif
                                ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300"
                                : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                            }`}
                          >
                            {jamAktif ? "✓ " : ""}{jam}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      Jadwal ini hanya berlaku hari <strong>{jadwalTerpilih.hari}</strong>. Jam dengan tanda ✓ sudah bisa diabsen hari ini.
                    </p>
                  </>
                )}
              </div>
            ) : null}

            <div className="bg-card text-card-foreground border border-border rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Panduan</h2>
              <Guide number="1" text="Aktifkan kamera." />
              <Guide number="2" text="Tekan Mulai Absensi." />
              <Guide number="3" text="Ikuti instruksi gesture yang muncul satu per satu." />
              <Guide number="4" text="Lakukan gesture saat countdown selesai dan progress bar berjalan." />
            </div>
          </aside>
        </section>

        {/* Hasil sesi PARSIAL — sesi ini beres, tapi masih ada sesi lain hari ini */}
        {result && result.hariSelesai === false && (
          <section className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-6">
            <span className="rounded-full px-3 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
              Sesi Tercatat
            </span>
            <h2 className="mt-4 text-xl font-bold">{result.pesan}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Tekan &quot;Mulai Absensi&quot; lagi saat sesi absensi berikutnya dibuka. Sistem akan memberi tahu otomatis.
            </p>
          </section>
        )}

        {/* Hasil FINAL — seluruh sesi hari ini sudah lengkap */}
        {result && result.hariSelesai !== false && (
          <section className={`rounded-2xl border p-6 ${
            result.berhasil
              ? result.status === "terlambat"
                ? "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30"
                : result.status === "tidak_hadir"
                  ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30"
                  : "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30"
              : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30"
          }`}>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              result.berhasil
                ? result.status === "terlambat"
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                  : result.status === "tidak_hadir"
                    ? "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300"
                    : "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300"
            }`}>
              {result.berhasil
                ? result.status === "terlambat"
                  ? "Absensi Berhasil (Terlambat)"
                  : result.status === "tidak_hadir"
                    ? "Absensi Berhasil (Tidak Hadir / Alfa)"
                    : "Absensi Berhasil"
                : "Absensi Gagal"}
            </span>

            <h2 className="mt-4 text-xl font-bold">
              {result.berhasil
                ? `Kehadiran ${result.nama} berhasil dicatat`
                : result.pesan}
            </h2>

            {result.berhasil && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Waktu: {result.waktu} • Akurasi wajah: {((result.confidence ?? 0) * 100).toFixed(1)}%
              </p>
            )}

            {result.berhasil && result.status === "terlambat" && result.telatTeks && (
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-2">
                {result.telatTeks}
              </p>
            )}

            {result.berhasil && result.status === "tidak_hadir" && (
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-2">
                {result.telatTeks || "Seluruh sesi absensi terlewat (Terhitung Tidak Hadir / Alfa)."}
              </p>
            )}

            {!result.berhasil && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Silakan tekan Mulai Absensi kembali untuk mencoba dengan gesture baru.
              </p>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function StatusRow({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
        green
          ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300"
          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
      }`}>
        {value}
      </span>
    </div>
  );
}

function Guide({ number, text }: { number: string; text: string }) {
  return (
    <div className="mb-3 flex gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 text-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {number}
      </span>
      <p>{text}</p>
    </div>
  );
}