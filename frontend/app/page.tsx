import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">Smart Attendance System</h1>
        <p className="text-gray-600 mb-8">
          Sistem Absensi Otomatis Berbasis Computer Vision
        </p>

        <div className="flex flex-col gap-4">
          <Link href="/mahasiswa" className="bg-blue-600 text-white py-3 rounded-lg">
            Masuk sebagai Mahasiswa
          </Link>

          <Link href="/dosen" className="bg-green-600 text-white py-3 rounded-lg">
            Masuk sebagai Dosen
          </Link>
        </div>
      </div>
    </main>
  );
}