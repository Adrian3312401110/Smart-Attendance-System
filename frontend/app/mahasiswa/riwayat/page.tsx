import SidebarMahasiswa from "@/components/SidebarMahasiswa";

export default function RiwayatMahasiswaPage() {
  const data = [
    {
      matkul: "Kecerdasan Buatan",
      tanggal: "17 Apr 2026",
      waktu: "08:03",
      metode: "Wajah + Lokasi",
      status: "Hadir",
      catatan: "-",
    },
    {
      matkul: "Jaringan Komputer",
      tanggal: "16 Apr 2026",
      waktu: "10:07",
      metode: "Wajah",
      status: "Terlambat",
      catatan: "Lewat 7 menit",
    },
    {
      matkul: "Basis Data",
      tanggal: "15 Apr 2026",
      waktu: "-",
      metode: "-",
      status: "Tidak Hadir",
      catatan: "Tidak melakukan absen",
    },
    {
      matkul: "Algoritma",
      tanggal: "14 Apr 2026",
      waktu: "08:01",
      metode: "Wajah + Lokasi",
      status: "Hadir",
      catatan: "-",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 flex">
      <SidebarMahasiswa />

      <section className="flex-1 p-8 text-slate-800">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Riwayat Saya</h1>
            <p className="text-sm text-slate-500">
              Lihat riwayat absensi Anda per mata kuliah dan pertemuan.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold shadow">
              Filter
            </button>
            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow">
              Export
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-4 gap-5">
          <StatCard title="Total Pertemuan" value="42" color="border-blue-200" />
          <StatCard title="Hadir" value="37" color="border-green-200" />
          <StatCard title="Terlambat" value="3" color="border-yellow-200" />
          <StatCard title="Tidak Hadir" value="2" color="border-red-200" />
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-xl font-bold">Riwayat Absensi</h2>

            <input
              type="text"
              placeholder="Cari mata kuliah..."
              className="w-64 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-5">Mata Kuliah</th>
                <th className="p-5">Tanggal</th>
                <th className="p-5">Waktu</th>
                <th className="p-5">Metode</th>
                <th className="p-5">Status</th>
                <th className="p-5">Catatan</th>
                <th className="p-5">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr key={item.matkul} className="border-t">
                  <td className="p-5 font-semibold">{item.matkul}</td>
                  <td className="p-5">{item.tanggal}</td>
                  <td className="p-5">{item.waktu}</td>
                  <td className="p-5">{item.metode}</td>
                  <td className="p-5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="p-5">{item.catatan}</td>
                  <td className="p-5">
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-6 shadow ${color}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-3 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Hadir"
      ? "bg-green-100 text-green-600"
      : status === "Terlambat"
      ? "bg-yellow-100 text-yellow-600"
      : "bg-red-100 text-red-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}