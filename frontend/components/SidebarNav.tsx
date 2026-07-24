"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart2,
  BookOpen,
  Calendar,
  ChevronLeft,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
  HelpCircle,
} from "lucide-react";

interface SidebarNavProps {
  role: "mahasiswa" | "dosen";
}

export default function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedCollapse = localStorage.getItem(`sidebar_collapsed_${role}`);
    const storedTheme = localStorage.getItem("app_theme");
    setCollapsed(storedCollapse === "1");
    setDarkMode(storedTheme ? storedTheme === "dark" : true);
    setMounted(true);
  }, [role]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    localStorage.setItem("app_theme", darkMode ? "dark" : "light");
  }, [darkMode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(`sidebar_collapsed_${role}`, collapsed ? "1" : "0");
  }, [collapsed, role, mounted]);

  const menu =
    role === "dosen"
      ? [
          { label: "Dashboard", href: "/dosen", icon: LayoutDashboard },
          { label: "Mahasiswa", href: "/dosen/mahasiswa", icon: Users },
          { label: "Mata Kuliah", href: "/dosen/matkul", icon: BookOpen },
          { label: "Jadwal", href: "/dosen/jadwal", icon: Calendar },
          { label: "Statistik", href: "/dosen/statistik", icon: BarChart2 },
          { label: "Absensi", href: "/dosen/absensi", icon: ClipboardList },
          { label: "Petunjuk", href: "/dosen/petunjuk", icon: HelpCircle },
        ]
      : [
          { label: "Dashboard", href: "/mahasiswa", icon: LayoutDashboard },
          { label: "Gabung Kelas", href: "/mahasiswa/gabung-kelas", icon: Users },
          { label: "Ambil Absensi", href: "/mahasiswa/ambil-absensi", icon: ClipboardList },
          { label: "Riwayat", href: "/mahasiswa/riwayat", icon: Calendar },
        ];

  function handleLogout() {
    localStorage.removeItem("auth_user");
    router.push("/auth/login");
  }

  return (
    <aside
      className={`flex-shrink-0 ${collapsed ? "w-20" : "w-72"} min-h-screen bg-[#0b1223] text-slate-200 p-3 flex flex-col transition-[width] duration-200 border-r border-white/5 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.35)] relative z-30`}
    >
      {/* Header — satu-satunya tombol buka/tutup, menyatu dengan logo */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        className={`mb-6 flex items-center rounded-xl transition-colors hover:bg-white/5 ${
          collapsed ? "justify-center p-2" : "justify-between p-2 pr-3"
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex-shrink-0 shadow-lg shadow-blue-900/40">
            <GraduationCap size={18} className="text-white" />
          </span>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="block text-sm font-bold text-white truncate">Smart Attendance</span>
              <span className="block text-xs text-slate-400 truncate">Panel {role === "dosen" ? "Dosen" : "Mahasiswa"}</span>
            </span>
          )}
        </span>
        {!collapsed && <ChevronLeft size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      <nav className="flex-1 space-y-1.5">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-1.5 pt-4 border-t border-white/5">
        <Link
          href={role === "dosen" ? "/dosen/settings" : "/mahasiswa/profile"}
          title={collapsed ? "Pengaturan" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
            pathname === (role === "dosen" ? "/dosen/settings" : "/mahasiswa/profile")
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          } ${collapsed ? "justify-center" : ""}`}
        >
          <Settings size={16} className="flex-shrink-0" />
          {!collapsed && <span>Pengaturan Pengguna</span>}
        </Link>

        <button
          type="button"
          onClick={() => setDarkMode((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? (darkMode ? "Light Mode" : "Dark Mode") : undefined}
        >
          {darkMode ? <Sun size={16} className="flex-shrink-0" /> : <Moon size={16} className="flex-shrink-0" />}
          {!collapsed && <span>{darkMode ? "Mode Terang" : "Mode Gelap"}</span>}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}