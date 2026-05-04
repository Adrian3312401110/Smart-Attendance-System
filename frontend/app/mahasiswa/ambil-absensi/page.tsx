import SidebarMahasiswa from "../../../components/SidebarMahasiswa";

export default function AmbilAbsensiPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex">
      <SidebarMahasiswa />

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-blue-600">
              Mahasiswa • Presensi Kelas
            </p>
            <h1 className="text-3xl font-bold">Ambil Absensi</h1>
            <p className="text-sm text-slate-500">
              Lakukan absensi dengan verifikasi wajah dan lokasi untuk sesi kelas yang sedang aktif.
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

        <section className="grid grid-cols-4 gap-5 mb-6">
          <InfoCard title="Mata Kuliah" value="Kecerdasan Buatan" blue />
          <InfoCard title="Dosen" value="Dr. Andi Saputra" />
          <InfoCard title="Jadwal" value="08:00 - 09:40 WIB" />
          <InfoCard title="Batas Absensi" value="08:30 WIB" yellow />
        </section>

        <section className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Verifikasi Wajah</h2>
                <p className="text-sm text-slate-500">
                  Arahkan wajah ke dalam frame lalu ambil absensi saat sistem siap.
                </p>
              </div>

              <span className="h-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                Sesi Aktif
              </span>
            </div>

            <div className="relative h-80 rounded-2xl bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center text-white">
              <span className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1 text-xs">
                Face Recognition Ready
              </span>

              <div className="w-52 h-52 rounded-3xl border-4 border-cyan-400 flex items-center justify-center">
                <div className="h-1 w-32 rounded bg-cyan-400" />
              </div>

              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
                <CameraBox title="Status Kamera" value="Aktif" />
                <CameraBox title="Deteksi Wajah" value="Berhasil" />
                <CameraBox title="Akurasi" value="97.8%" />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-600">
                Aktifkan Kamera
              </button>

              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">
                Cek Lokasi
              </button>

              <button className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white">
                Scan Wajah & Absen
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Status Pemeriksaan</h2>

              <StatusRow label="Kamera" value="Siap" green />
              <StatusRow label="Lokasi" value="Di Dalam Area Kampus" green />
              <StatusRow label="Wajah" value="Terdeteksi" blue />
              <StatusRow label="Jaringan" value="Stabil" />
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Panduan Cepat</h2>

              <Guide number="1" text="Pastikan wajah berada tepat di tengah frame." />
              <Guide number="2" text="Aktifkan kamera dan izinkan akses lokasi." />
              <Guide number="3" text="Tunggu sistem mendeteksi wajah dengan jelas." />
              <Guide number="4" text="Tekan tombol ambil absensi saat semua status siap." />
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-green-200 bg-green-50 p-6 flex items-center justify-between">
          <div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
              Absensi Berhasil
            </span>

            <h2 className="mt-4 text-xl font-bold">
              Kehadiran Anda berhasil dicatat
            </h2>

            <p className="text-sm text-slate-600 mt-1">
              Waktu check-in: 08:03 WIB • Lokasi tervalidasi • Akurasi wajah 97.8%
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold">
              Lihat Detail
            </button>

            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
              Kembali ke Dashboard
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  value,
  blue = false,
  yellow = false,
}: {
  title: string;
  value: string;
  blue?: boolean;
  yellow?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 shadow bg-white ${
        blue ? "bg-blue-50 border-blue-200" : ""
      } ${yellow ? "bg-yellow-50 border-yellow-200" : ""}`}
    >
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-3 text-xl font-bold">{value}</h2>
    </div>
  );
}

function CameraBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-4">
      <p className="text-xs text-blue-100">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  green = false,
  blue = false,
}: {
  label: string;
  value: string;
  green?: boolean;
  blue?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          green
            ? "bg-green-100 text-green-600"
            : blue
            ? "bg-blue-100 text-blue-600"
            : "bg-slate-100 text-slate-500"
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