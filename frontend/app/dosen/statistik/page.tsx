"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  ClipboardList, Settings, LogOut, GraduationCap,
  Search, Bell, Maximize, ChevronDown, Sun,
  Clock, UserX, Eye, Moon, UserMinus, SlidersHorizontal, Trophy
} from "lucide-react";

function SidebarDosen() {
  const pathname = usePathname();
  const menu = [
    { icon: LayoutDashboard, href: "/dosen" },
    { icon: Users, href: "/dosen/mahasiswa" },
    { icon: Calendar, href: "/dosen/jadwal" },
    { icon: BarChart2, href: "/dosen/statistik" },
    { icon: ClipboardList, href: "/dosen/absensi" },
  ];
  return (
    <aside className="w-16 min-h-screen bg-[#1a1f36] flex flex-col items-center py-5 gap-5 fixed left-0 top-0 z-50">
      <div className="text-white mb-2"><GraduationCap size={24} /></div>
      <nav className="flex flex-col gap-2 flex-1">
        {menu.map((item) => (
          <Link key={item.href} href={item.href}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              pathname === item.href ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-blue-600 hover:text-white"
            }`}
          >
            <item.icon size={18} />
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 items-center">
        <Link href="/dosen/settings" className="text-slate-400 hover:text-white"><Settings size={18} /></Link>
        <Link href="/login" className="text-slate-400 hover:text-red-400"><LogOut size={18} /></Link>
      </div>
    </aside>
  );
}

const dailyData = [
  { label: "01 Aug", value: 65 },
  { label: "02 Aug", value: 70 },
  { label: "03 Aug", value: 60 },
  { label: "04 Aug", value: 91 },
  { label: "07 Aug", value: 55 },
  { label: "08 Aug", value: 75 },
  { label: "09 Aug", value: 68 },
  { label: "10 Aug", value: 58 },
  { label: "11 Aug", value: 80 },
  { label: "14 Aug", value: 62 },
  { label: "15 Aug", value: 70 },
  { label: "16 Aug", value: 64 },
];

const weeklyChart = [
  { label: "Sains", value: 60 },
  { label: "TI", value: 70 },
  { label: "Manajemen", value: 86 },
  { label: "Hukum", value: 65 },
  { label: "Seni", value: 40 },
];

const topStudents = [
  { rank: 1, name: "Sarah Jhonson", kelas: "IF 4A Pagi", attendance: 99, color: "bg-yellow-400" },
  { rank: 2, name: "Ahmed Rashdan", kelas: "IF 4A Pagi", attendance: 97, color: "bg-slate-300" },
  { rank: 3, name: "Jhon Neleson", kelas: "IF 4B Pagi", attendance: 95, color: "bg-amber-600" },
  { rank: 4, name: "Mona Alghafar", kelas: "IF 4A Pagi", attendance: 93, color: "bg-blue-200" },
  { rank: 5, name: "Moustafa Adel", kelas: "IF 4C Pagi", attendance: 91, color: "bg-blue-200" },
];

function buildLinePath(data: { value: number }[], width: number, height: number) {
  const max = 100;
  const stepX = width / (data.length - 1);
  return data
    .map((d, i) => {
      const x = i * stepX;
      const y = height - (d.value / max) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function DosenStatistikPage() {
  const [time, setTime] = useState("");
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [hoverIndex, setHoverIndex] = useState<number | null>(3);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setTime(`${h}:${m}:${s} ${ampm}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const todayShort = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const stats1 = [
    { label: "Total Student", value: 452, icon: Users, color: "bg-blue-100 text-blue-600", change: "+2 new student added!", up: true },
    { label: "On Time", value: 360, icon: Clock, color: "bg-green-100 text-green-600", change: "-10% Less than yesterday", up: false },
    { label: "Absent", value: 30, icon: UserX, color: "bg-orange-100 text-orange-600", change: "+3% Increase than yesterday", up: false },
  ];

  const stats2 = [
    { label: "Late Arrival", value: 62, icon: Eye, color: "bg-orange-100 text-orange-600", change: "+3% Increase than yesterday", up: false },
    { label: "Early Departures", value: 6, icon: Moon, color: "bg-blue-100 text-blue-600", change: "-10% Less than yesterday", up: true },
    { label: "Time-off", value: 42, icon: UserMinus, color: "bg-purple-100 text-purple-600", change: "+2% Increase than yesterday", up: false },
  ];

  const chartWidth = 760;
  const chartHeight = 180;
  const linePath = buildLinePath(dailyData, chartWidth, chartHeight);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <SidebarDosen />
      <div className="ml-16 flex-1 flex flex-col">

        {/* Topbar */}
        <div className="bg-blue-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span className="text-white font-semibold text-base">Smart Attendance System</span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input placeholder="Quick Search..." className="bg-white/20 text-white placeholder-white/60 text-sm rounded-full pl-8 pr-4 py-1.5 outline-none w-48" />
            </div>
            <Bell size={16} className="text-white cursor-pointer" />
            <Maximize size={16} className="text-white cursor-pointer" />
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm">D</div>
              <div className="text-left">
                <p className="text-white text-xs font-medium">Dosen</p>
                <p className="text-white/70 text-[11px]">dosen@polibatam.ac.id</p>
              </div>
              <ChevronDown size={12} className="text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-400 mb-4">Dashboard / <span className="text-blue-600 font-medium">Attendance Insights</span></p>

          {/* Stats Row 1 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-700 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sun size={18} />
                <span className="text-xl font-bold">{time}</span>
              </div>
              <p className="text-xs text-blue-200">Today:</p>
              <p className="text-sm font-medium">{todayShort}</p>
              <button className="mt-3 text-xs bg-white/20 rounded-lg px-3 py-1.5 hover:bg-white/30 w-full text-left">
                ⚙ Advanced Configuration
              </button>
            </div>
            {stats1.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className={`text-xs ${s.up ? "text-green-600" : "text-red-500"}`}>
                  {s.up ? "▲" : "▼"} {s.change}
                </p>
              </div>
            ))}
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats2.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                </div>
                <p className={`text-xs ${s.up ? "text-green-600" : "text-red-500"}`}>
                  {s.up ? "▲" : "▼"} {s.change}
                </p>
              </div>
            ))}
          </div>

          {/* Top Performing Students */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Trophy size={18} className="text-yellow-500" />
              <h2 className="font-semibold text-slate-800">Top Performing Students</h2>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {topStudents.map((s) => (
                <div key={s.rank} className="border border-slate-100 rounded-xl p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                  <div className="relative mb-3">
                    <div className={`w-14 h-14 rounded-full ${s.color} flex items-center justify-center text-white font-bold text-lg`}>
                      {s.name.charAt(0)}
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                      #{s.rank}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400 mb-2">{s.kelas}</p>
                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
                    {s.attendance}% Hadir
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-3 gap-4">
            {/* Attendance Comparison Chart */}
            <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-semibold text-slate-800">Attendance Comparison Chart</h2>
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
                  {(["daily", "weekly", "monthly"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                        range === r ? "bg-blue-600 text-white" : "text-slate-500"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full h-52">
                {/* gridlines */}
                {[0, 25, 50, 75, 100].map((g) => (
                  <line
                    key={g}
                    x1={0}
                    x2={chartWidth}
                    y1={chartHeight - (g / 100) * chartHeight}
                    y2={chartHeight - (g / 100) * chartHeight}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}

                <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={3} />

                {dailyData.map((d, i) => {
                  const x = (chartWidth / (dailyData.length - 1)) * i;
                  const y = chartHeight - (d.value / 100) * chartHeight;
                  const isHover = hoverIndex === i;
                  return (
                    <g key={i} onMouseEnter={() => setHoverIndex(i)}>
                      <circle cx={x} cy={y} r={isHover ? 6 : 4} fill={isHover ? "#2563eb" : "#fff"} stroke="#2563eb" strokeWidth={2} />
                      {isHover && (
                        <>
                          <line x1={x} x2={x} y1={0} y2={chartHeight} stroke="#bfdbfe" strokeWidth={2} strokeDasharray="4 4" />
                          <rect x={x - 18} y={y - 32} width={36} height={20} rx={6} fill="#2563eb" />
                          <text x={x} y={y - 18} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                            {d.value}%
                          </text>
                        </>
                      )}
                      <text x={x} y={chartHeight + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Weekly Attendance bar */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-semibold text-slate-800">Weekly Attendance</h2>
                <SlidersHorizontal size={14} className="text-slate-400" />
              </div>
              <div className="flex items-end gap-3 h-44">
                {weeklyChart.map((d, i) => {
                  const isMax = d.value === Math.max(...weeklyChart.map((x) => x.value));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      {isMax && <span className="text-xs font-bold text-blue-600">{d.value}%</span>}
                      <div
                        className={`w-full rounded-md ${isMax ? "bg-blue-600" : "bg-slate-200"}`}
                        style={{ height: `${d.value}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3">
                {weeklyChart.map((d) => (
                  <span key={d.label} className="text-[10px] text-slate-400 flex-1 text-center">{d.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}