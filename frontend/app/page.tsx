import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-2 text-3xl font-bold">Smart Attendance System</h1>
        <p className="mb-8 text-gray-600">
          Sistem Absensi Otomatis Berbasis Computer Vision
        </p>

        <div className="flex flex-col gap-4">
          <Link href="/auth/login" className="rounded-lg bg-blue-600 py-3 text-white">
            Masuk ke Akun
          </Link>

          <Link href="/auth/register" className="rounded-lg bg-green-600 py-3 text-white">
            Daftar Akun Baru
          </Link>
        </div>
      </div>
    </main>
  );
}