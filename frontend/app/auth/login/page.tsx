"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.berhasil) {
        throw new Error(data.pesan || "Login gagal");
      }

      localStorage.setItem("auth_user", JSON.stringify(data.user));
      if (data.user.role === "dosen") router.push("/dosen");
      else router.push("/mahasiswa");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Smart Attendance System</p>
          <h1 className="mt-2 text-2xl font-bold">Masuk ke Akun</h1>
          <p className="mt-2 text-sm text-blue-100">Silakan masuk menggunakan email dan password Anda.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="********"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-500">
            Belum punya akun? <Link href="/auth/register" className="font-semibold text-blue-600">Daftar sekarang</Link>
          </p>
        </div>
      </div>
    </main>
  );
}