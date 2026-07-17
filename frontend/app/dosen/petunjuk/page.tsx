"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HelpCircle, BookOpen, Calendar, ClipboardList, BarChart2,
  Users, Settings, GraduationCap, AlertCircle, CheckCircle2,
  ChevronDown, ChevronRight
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface FaqItem {
  q: string;
  a: string;
}

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  items: FaqItem[];
}

const sections: Section[] = [
  {
    id: "mulai",
    icon: GraduationCap,
    title: "Memulai Sistem",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
    items: [
      { q: "Bagaimana cara login sebagai dosen?", a: "Buka halaman login di /auth/login, masukkan email dan password akun dosen Anda. Sistem akan otomatis mengarahkan ke Dashboard Dosen." },
      { q: "Apa yang pertama kali harus dilakukan setelah login?", a: "Setelah login, disarankan untuk: (1) Menambahkan Mata Kuliah di menu Mata Kuliah, (2) Membuat Kelas di menu Mahasiswa, lalu (3) Membuat Jadwal di menu Jadwal." },
    ],
  },
  {
    id: "mahasiswa",
    icon: Users,
    title: "Mengelola Mahasiswa",
    color: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300",
    items: [
      { q: "Bagaimana cara membuat kelas?", a: "Pergi ke menu Mahasiswa, klik tombol 'Buat Kelas Baru'. Isi nama kelas dan kode bergabung. Bagikan kode bergabung kepada mahasiswa." },
      { q: "Bagaimana mahasiswa bergabung ke kelas?", a: "Mahasiswa login ke akun mereka, pergi ke menu 'Gabung Kelas', lalu masukkan kode bergabung yang Anda berikan." },
      { q: "Bagaimana cara menyetujui mahasiswa yang mendaftar?", a: "Di menu Mahasiswa, pilih kelas yang ingin dikelola. Mahasiswa yang sudah mendaftar akan muncul dengan status 'Menunggu'. Klik tombol Setujui atau Tolak." },
    ],
  },
  {
    id: "matkul",
    icon: BookOpen,
    title: "Mata Kuliah",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300",
    items: [
      { q: "Bagaimana cara menambah mata kuliah?", a: "Buka menu Mata Kuliah, klik 'Tambah Mata Kuliah'. Isi kode unik, nama, dan jumlah SKS. Mata kuliah yang Anda buat hanya terlihat di akun Anda." },
      { q: "Bisakah saya mengubah kode mata kuliah?", a: "Ya, kode mata kuliah bisa diubah SELAMA belum dipakai di jadwal manapun. Jika sudah ada jadwal yang menggunakan mata kuliah tersebut, kode tidak bisa diubah." },
      { q: "Mengapa daftar mata kuliah berbeda di tiap akun dosen?", a: "Setiap mata kuliah terikat ke akun dosen yang membuatnya. Mata kuliah dari dosen lain tidak akan muncul di daftar Anda." },
    ],
  },
  {
    id: "jadwal",
    icon: Calendar,
    title: "Jadwal Kelas",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300",
    items: [
      { q: "Bagaimana cara membuat jadwal?", a: "Buka menu Jadwal, klik 'Tambah Jadwal'. Pilih kelas, mata kuliah, hari, jam mulai-selesai, toleransi keterlambatan (menit), dan tentukan lokasi kelas di peta." },
      { q: "Bagaimana cara menentukan lokasi kelas?", a: "Di form jadwal, klik pada peta untuk menandai titik lokasi kelas. Atau gunakan tombol lokasi di peta untuk menggunakan lokasi Anda saat ini. Anda juga bisa mengetik nama tempat di kolom pencarian lokasi." },
      { q: "Apa itu toleransi keterlambatan?", a: "Toleransi keterlambatan adalah jumlah menit setelah jam mulai di mana mahasiswa masih bisa absen dengan status 'Terlambat'. Setelah batas ini, mahasiswa tidak bisa absen." },
      { q: "Bagaimana cara mengaktifkan sesi absensi?", a: "Di halaman Jadwal, temukan jadwal yang ingin dibuka. Klik 'Buka Absensi' untuk mengaktifkan sesi. Mahasiswa baru bisa mengambil absensi jika sesi aktif." },
    ],
  },
  {
    id: "absensi",
    icon: ClipboardList,
    title: "Data Absensi",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
    items: [
      { q: "Bagaimana cara melihat data absensi?", a: "Buka menu Absensi. Pilih jadwal dari dropdown di bagian atas. Data kehadiran untuk jadwal tersebut akan ditampilkan dalam tabel." },
      { q: "Bagaimana cara memfilter status kehadiran?", a: "Di halaman Absensi, gunakan filter dropdown di atas tabel untuk memilih: Semua Status, Hadir, Terlambat, atau Alfa / Tidak Hadir." },
      { q: "Apa perbedaan status Hadir, Terlambat, dan Tidak Hadir?", a: "Hadir: mahasiswa absen sebelum batas toleransi. Terlambat: absen setelah jam mulai tapi masih dalam toleransi. Tidak Hadir (Alfa): mahasiswa tidak melakukan absen sama sekali." },
    ],
  },
  {
    id: "statistik",
    icon: BarChart2,
    title: "Statistik & Laporan",
    color: "bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300",
    items: [
      { q: "Apa yang ditampilkan di halaman Statistik?", a: "Halaman Statistik menampilkan: ringkasan total kehadiran, mahasiswa dengan kehadiran terbaik (Top Performing Students), tren kehadiran harian, dan perbandingan kehadiran per mata kuliah." },
      { q: "Bagaimana cara melihat Top Student per kelas atau per matkul?", a: "Di bagian 'Top Performing Students', gunakan dropdown filter untuk memilih: Semua (Global), Per Kelas, atau Per Mata Kuliah tertentu." },
      { q: "Bagaimana cara mengubah rentang tren kehadiran?", a: "Di bagian 'Tren Kehadiran', gunakan dropdown di pojok kanan untuk memilih rentang waktu: 7, 14, 21, atau 28 hari terakhir." },
    ],
  },
  {
    id: "pengaturan",
    icon: Settings,
    title: "Pengaturan Pengguna",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    items: [
      { q: "Bagaimana cara mengubah nama atau email?", a: "Buka menu Pengaturan Pengguna. Edit kolom Nama Depan, Nama Belakang, atau Email, lalu klik tombol 'Simpan Perubahan'." },
      { q: "Bagaimana cara mengubah password?", a: "Di halaman Pengaturan, scroll ke bagian 'Ubah Password'. Masukkan password lama, password baru (minimal 12 karakter dengan 1 simbol), dan konfirmasi password baru. Klik 'Ubah Password'." },
      { q: "Bagaimana cara beralih antara Mode Terang dan Mode Gelap?", a: "Di bagian bawah sidebar kiri, klik tombol Mode Terang/Mode Gelap untuk berganti tampilan." },
    ],
  },
];

export default function PetunjukPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("mulai");
  const [openItem, setOpenItem] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) { router.replace("/auth/login"); return; }
    try {
      const parsedUser = JSON.parse(storedUser) as { id: string; name: string; email: string; role: string };
      if (parsedUser.role !== "dosen") { router.replace("/mahasiswa"); return; }
      setAuthUser(parsedUser);
    } catch {
      router.replace("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    if (!authUser?.id) return;
    fetch(`http://localhost:8000/dosen/${authUser.id}`)
      .then((r) => r.json())
      .then((data) => setFotoUrl(data?.foto_url ?? null))
      .catch(() => {});
  }, [authUser]);

  const userInitials = (authUser?.name ?? "D")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <SidebarNav role="dosen" />
      <div className="flex-1 flex flex-col">

        {/* Topbar */}
        <div className="bg-blue-700 dark:bg-blue-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span className="text-white font-semibold text-base">Smart Attendance System</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-default">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                {fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : userInitials}
              </div>
              <div className="text-left">
                <p className="text-white text-xs font-medium">{authUser?.name ?? "Dosen"}</p>
                <p className="text-white/70 text-[11px]">{authUser?.email ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto w-full">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Bantuan /</p>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <HelpCircle size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Petunjuk Penggunaan</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Panduan lengkap menggunakan Smart Attendance System</p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-4 flex gap-3">
              <CheckCircle2 size={18} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Urutan Penggunaan</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                  Buat Mata Kuliah → Buat Kelas → Buat Jadwal → Buka Sesi Absensi
                </p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-xl p-4 flex gap-3">
              <AlertCircle size={18} className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Penting Diketahui</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                  Sesi absensi harus aktif agar mahasiswa bisa melakukan absensi
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Accordion per Section */}
          <div className="space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isOpen = openSection === section.id;
              return (
                <div key={section.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-transparent dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.color}`}>
                        <Icon size={17} />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{section.title}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{section.items.length} pertanyaan</span>
                    </div>
                    {isOpen
                      ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                      : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {section.items.map((item, idx) => {
                        const itemKey = `${section.id}-${idx}`;
                        const itemOpen = openItem === itemKey;
                        return (
                          <div key={itemKey}>
                            <button
                              type="button"
                              onClick={() => setOpenItem(itemOpen ? null : itemKey)}
                              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3"
                            >
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.q}</span>
                              {itemOpen
                                ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                                : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                              }
                            </button>
                            {itemOpen && (
                              <div className="px-5 pb-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/50 rounded-lg px-4 py-3">
                                  {item.a}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-8 bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Masih ada pertanyaan? Hubungi administrator sistem atau lihat dokumentasi teknis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

