import Link from "next/link";

export default function RegistrasiWajahPage() {
  const menu = [
    { label: "Dashboard", href: "/mahasiswa" },
    { label: "Registrasi Wajah", href: "/mahasiswa/registrasi-wajah" },
    { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi" },
    { label: "Riwayat Mahasiswa", href: "/mahasiswa/riwayat" },
    { label: "Profile", href: "/mahasiswa/profile" },
  ];

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
            <p className="text-sm font-bold text-blue-600">
              Mahasiswa • Verifikasi Biometrik
            </p>
            <h1 className="text-3xl font-bold">Registrasi Wajah</h1>
            <p className="text-sm text-slate-500">
              Daftarkan wajah Anda untuk mendukung proses absensi yang cepat,
              aman, dan akurat.
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
                Live Camera
              </span>
            </div>

            <div className="h-80 bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl flex items-center justify-center relative text-white">
              <div className="w-48 h-48 border-4 border-cyan-400 rounded-3xl flex items-center justify-center">
                <div className="w-28 h-1 bg-cyan-400 rounded" />
              </div>

              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
                <InfoBox title="Status Kamera" value="Aktif" />
                <InfoBox title="Pencahayaan" value="Baik" />
                <InfoBox title="Deteksi Wajah" value="Terdeteksi" />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                Aktifkan Kamera
              </button>
              <button className="border border-blue-300 text-blue-600 px-4 py-2 rounded-xl font-bold text-sm">
                Ambil Sampel
              </button>
              <button className="border px-4 py-2 rounded-xl font-bold text-sm">
                Upload Foto
              </button>
              <button className="border border-red-300 text-red-500 px-4 py-2 rounded-xl font-bold text-sm">
                Reset
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Status Registrasi</h2>
              <StatusRow label="Status Akun" value="Mahasiswa Aktif" />
              <StatusRow label="Registrasi Wajah" value="Belum Selesai" yellow />
              <StatusRow label="Sampel Tersimpan" value="2 / 3" />
              <StatusRow label="Akurasi Awal" value="96%" />
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-5">Panduan</h2>
              <Guide number="1" text="Pastikan wajah terlihat jelas dan berada di tengah frame." />
              <Guide number="2" text="Gunakan pencahayaan yang cukup dan hindari backlight." />
              <Guide number="3" text="Lepaskan masker, topi, atau benda yang menutupi wajah." />
              <Guide number="4" text="Hadapkan wajah ke depan dan jangan terlalu dekat ke kamera." />
            </div>
          </aside>
        </section>

        <section className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Sampel Wajah</h2>
              <p className="text-sm text-slate-500">
                Pastikan minimal tiga sampel wajah tersimpan sebelum mengirim registrasi.
              </p>
            </div>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold">
              Simpan Registrasi
            </button>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <SampleCard title="Sampel 1" status="Tersimpan" />
            <SampleCard title="Sampel 2" status="Tersimpan" />
            <SampleCard title="Sampel 3" status="Menunggu" />
          </div>
        </section>

        <section className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <h3 className="font-bold">Pastikan data wajah Anda benar sebelum dikirim.</h3>
            <p className="text-sm text-slate-500">
              Setelah registrasi dikirim, data akan digunakan untuk proses absensi otomatis.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="bg-white px-5 py-2 rounded-xl text-sm font-bold">
              Simpan Nanti
            </button>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold">
              Kirim Registrasi
            </button>
          </div>
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

function StatusRow({
  label,
  value,
  yellow = false,
}: {
  label: string;
  value: string;
  yellow?: boolean;
}) {
  return (
    <div className="flex justify-between mb-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          yellow
            ? "bg-yellow-100 text-yellow-600"
            : "bg-blue-100 text-blue-600"
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

function SampleCard({ title, status }: { title: string; status: string }) {
  return (
    <div className="border rounded-2xl p-4">
      <div className="h-44 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm mb-4">
        Preview {title}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-slate-500">Wajah depan</p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            status === "Tersimpan"
              ? "bg-green-100 text-green-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}