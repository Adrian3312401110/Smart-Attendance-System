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
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  HelpCircle,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Tutup drawer mobile otomatis setiap kali pindah halaman
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Kunci scroll body saat drawer mobile terbuka, supaya konten di
  // belakangnya tidak ikut ter-scroll bersamaan
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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
    <>
      {/* Tombol hamburger -- hanya muncul di layar mobile (di bawah breakpoint lg) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Buka menu navigasi"
        className="lg:hidden fixed top-3 left-3 z-[60] flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1223] text-white shadow-lg ring-1 ring-white/10"
      >
        <Menu size={20} />
      </button>

      {/* Overlay gelap di belakang drawer saat terbuka (mobile saja) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col
          bg-[#0b1223] p-3 text-slate-200 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.35)]
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:min-h-screen lg:translate-x-0 lg:border-r lg:border-white/5
          lg:transition-[width] lg:duration-200
          ${collapsed ? "lg:w-20" : "lg:w-72"}
        `}
      >
        {/* Header */}
        <div
          className={`mb-6 flex items-center justify-between rounded-xl p-2 pr-3 ${
            collapsed ? "lg:justify-center lg:p-2 lg:pr-2" : ""
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
              <GraduationCap size={18} className="text-white" />
            </span>
            <span className={`min-w-0 text-left ${collapsed ? "lg:hidden" : ""}`}>
              <span className="block truncate text-sm font-bold text-white">Smart Attendance</span>
              <span className="block truncate text-xs text-slate-400">
                Panel {role === "dosen" ? "Dosen" : "Mahasiswa"}
              </span>
            </span>
          </span>

          {/* Tombol tutup -- hanya di drawer mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>

          {/* Tombol ciutkan/perluas -- hanya di desktop */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className={`hidden text-slate-400 hover:text-white lg:flex ${collapsed ? "lg:hidden" : ""}`}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto">
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
                } ${collapsed ? "lg:justify-center" : ""}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 space-y-1.5 border-t border-white/5 pt-4">
          {role === "mahasiswa" && (
            <Link
              href="/mahasiswa/profile"
              title={collapsed ? "Pengaturan Pengguna" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                pathname === "/mahasiswa/profile"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              } ${collapsed ? "lg:justify-center" : ""}`}
            >
              <Settings size={16} className="flex-shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>Pengaturan Pengguna</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            className={`flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white ${
              collapsed ? "lg:justify-center" : ""
            }`}
            title={collapsed ? (darkMode ? "Light Mode" : "Dark Mode") : undefined}
          >
            {darkMode ? <Sun size={16} className="flex-shrink-0" /> : <Moon size={16} className="flex-shrink-0" />}
            <span className={collapsed ? "lg:hidden" : ""}>{darkMode ? "Mode Terang" : "Mode Gelap"}</span>
          </button>

          {role === "dosen" && (
            <Link
              href="/dosen/settings"
              title={collapsed ? "Settings" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                pathname === "/dosen/settings"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              } ${collapsed ? "lg:justify-center" : ""}`}
            >
              <Settings size={16} className="flex-shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>Pengaturan Pengguna</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}