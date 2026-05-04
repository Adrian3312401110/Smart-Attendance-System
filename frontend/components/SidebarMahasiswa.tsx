"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarMahasiswa() {
  const pathname = usePathname();

  const menu = [
    { label: "Dashboard", href: "/mahasiswa" },
    { label: "Registrasi Wajah", href: "/mahasiswa/registrasi-wajah" },
    { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi" },
    { label: "Riwayat Mahasiswa", href: "/mahasiswa/riwayat" },
    { label: "Profile", href: "/mahasiswa/profile" },
  ];

  return (
    <aside className="w-72 min-h-screen bg-blue-700 text-white p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="text-xl font-bold">Smart Attendance</h1>
        <p className="text-sm text-blue-100">Panel Mahasiswa</p>
      </div>

      <nav className="space-y-3 flex-1">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl px-4 py-3 font-medium ${
              pathname === item.href
                ? "bg-white text-blue-700"
                : "text-blue-100 hover:bg-blue-600 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/"
        className="mt-6 block rounded-xl bg-red-500 px-4 py-3 text-center font-semibold text-white hover:bg-red-600"
      >
        Logout
      </Link>
    </aside>
  );
}