export default function DosenPage() {
  const dataAbsensi = [
    { nama: "Ahmad", nim: "2023001", status: "Hadir" },
    { nama: "Siti", nim: "2023002", status: "Terlambat" },
    { nama: "Budi", nim: "2023003", status: "Belum Hadir" },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard Dosen</h1>
      <p className="mb-6">Monitoring data absensi mahasiswa.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-2xl font-bold">32</h2>
          <p>Total Mahasiswa</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-2xl font-bold">24</h2>
          <p>Hadir</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-2xl font-bold">8</h2>
          <p>Belum/Terlambat</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Data Absensi</h2>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th>Nama</th>
              <th>NIM</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {dataAbsensi.map((item) => (
              <tr key={item.nim} className="border-b">
                <td className="py-2">{item.nama}</td>
                <td>{item.nim}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}