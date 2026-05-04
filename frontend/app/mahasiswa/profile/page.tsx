import SidebarMahasiswa from "@/components/SidebarMahasiswa";

export default function ProfileMahasiswaPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex">
      <SidebarMahasiswa />

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Profil Saya</h1>
          <p className="text-sm text-slate-500">
            Kelola informasi akun dan keamanan Anda
          </p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-28 h-28 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold mb-4">
                M
              </div>

              <h2 className="text-xl font-bold">Mikaa</h2>
              <p className="text-sm text-slate-500">
                Mahasiswa • Teknik Informatika
              </p>

              <button className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                Ubah Foto
              </button>
            </div>

            <div className="space-y-5 text-sm">
              <Info label="NIM" value="123456789" />
              <Info label="Fakultas" value="Teknik" />
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
                  Aktif
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow p-8">
              <h2 className="text-xl font-bold mb-6">Informasi Akun</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="input" placeholder="Nama Lengkap" />
                <input className="input" placeholder="Email" />
                <input className="input" placeholder="Nomor HP" />
                <input className="input" placeholder="Program Studi" />
              </div>

              <button className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                Simpan Perubahan
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow p-8">
              <h2 className="text-xl font-bold mb-6">Keamanan</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input className="input" placeholder="Password Lama" type="password" />
                <input className="input" placeholder="Password Baru" type="password" />
                <input className="input" placeholder="Konfirmasi Password" type="password" />
              </div>

              <button className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                Ubah Password
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}