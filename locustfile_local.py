"""
Locust load test untuk Smart Attendance System -- VERSI TESTING LOKAL
======================================================================

Dipakai untuk menguji backend yang sedang jalan lokal via:
    uvicorn backend.main:app --reload

PRASYARAT SEBELUM MENJALANKAN:
1. Pastikan backend lokal sudah jalan (`uvicorn backend.main:app --reload`)
   dan bisa diakses di http://127.0.0.1:8000/health -> {"status":"ok"}
2. pip install locust  (di venv yang sama, atau venv terpisah -- keduanya boleh)
3. Siapkan akun TEST yang SUDAH terdaftar di database yang dipakai backend
   lokal kamu (DATABASE_URL di .env), isi kredensialnya di
   DOSEN_ACCOUNTS / MAHASISWA_ACCOUNTS di bawah.
4. Untuk menguji alur absensi penuh (MahasiswaAbsensiUser), pastikan:
   - Akun mahasiswa test sudah "approved" di minimal 1 kelas
   - Kelas itu punya jadwal utk HARI INI dengan jam absensi yang realistis
     (tidak harus persis sekarang -- endpoint tetap dipanggil untuk mengetes
     beban CPU-nya, bukan untuk lolos absen beneran)
   - Siapkan 1 file foto wajah contoh bernama `sample_face.jpg` di folder
     yang sama dengan file ini

CARA MENJALANKAN (dengan UI, paling gampang untuk mulai):
    locust -f locustfile_local.py

    Lalu buka http://localhost:8089 -- host sudah otomatis terisi
    http://127.0.0.1:8000 (lihat HOST_DEFAULT di bawah), tinggal atur jumlah
    user & spawn rate, klik Start.

CARA MENJALANKAN TANPA UI (langsung dari CLI), contoh 10 user, 5 menit:
    locust -f locustfile_local.py --headless -u 10 -r 2 -t 5m --csv=hasil_lokal

CATATAN PENTING UNTUK TESTING LOKAL:
- Karena ini jalan di 1 mesin yang sama (Locust DAN backend berbagi CPU
  laptop kamu), angka response time di sini TIDAK merepresentasikan performa
  asli di HF Space CPU Basic (2 vCPU) -- laptop kamu kemungkinan besar lebih
  kuat. Gunakan test ini untuk:
    a) Memverifikasi tidak ada error 5xx / crash di bawah beban
    b) Mengecek endpoint /server-waktu & /liveness/gesture-challenge
       tetap konsisten (jam WIB benar) walau di-hit berkali-kali cepat
    c) Uji fungsional alur end-to-end sebelum nanti diuji lagi di HF Space
       yang sebenarnya (spek 2 vCPU asli)
"""

import base64
import io
import os
import random

from locust import HttpUser, task, between, tag, events

# ============================================================
# KONFIGURASI
# ============================================================

HOST_DEFAULT = "http://127.0.0.1:8000"

DOSEN_ACCOUNTS = [
    {"email": "dosen@gmail.com", "password": "TestPass123!"},
]

MAHASISWA_ACCOUNTS = [
    {"email": "mhs1@test.com", "password": "TestPass123!"},
]

SAMPLE_FACE_IMAGE_PATH = os.environ.get("SAMPLE_FACE_IMAGE_PATH", "sample_face.jpg")

_SAMPLE_IMAGE_BYTES = None


def get_sample_image_bytes() -> bytes:
    global _SAMPLE_IMAGE_BYTES
    if _SAMPLE_IMAGE_BYTES is not None:
        return _SAMPLE_IMAGE_BYTES

    if os.path.exists(SAMPLE_FACE_IMAGE_PATH):
        with open(SAMPLE_FACE_IMAGE_PATH, "rb") as f:
            _SAMPLE_IMAGE_BYTES = f.read()
        return _SAMPLE_IMAGE_BYTES

    # Fallback placeholder 1x1 kalau file contoh tidak ditemukan -- tidak akan
    # lolos deteksi wajah, tapi tetap berguna untuk mengukur overhead dasar.
    _SAMPLE_IMAGE_BYTES = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8"
        "BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    return _SAMPLE_IMAGE_BYTES


def login(client, email, password, label):
    with client.post(
        "/auth/login",
        json={"email": email, "password": password},
        name=label,
        catch_response=True,
    ) as resp:
        try:
            data = resp.json()
        except Exception:
            resp.failure("Response bukan JSON valid")
            return None
        if resp.status_code != 200 or not data.get("berhasil"):
            resp.failure(f"Login gagal: {data.get('pesan', 'tidak diketahui')}")
            return None
        resp.success()
        return data.get("user")


# ============================================================
# ROLE: DOSEN
# ============================================================

class DosenUser(HttpUser):
    host = HOST_DEFAULT
    weight = 3
    wait_time = between(2, 6)

    def on_start(self):
        akun = random.choice(DOSEN_ACCOUNTS)
        self.user = login(self.client, akun["email"], akun["password"], "/auth/login [dosen]")
        self.id_dosen = self.user["id"] if self.user else None
        self.id_jadwal_list = []

        if self.id_dosen:
            self._muat_jadwal()

    def _muat_jadwal(self):
        with self.client.get(
            "/jadwal/detail", name="/jadwal/detail", catch_response=True
        ) as resp:
            try:
                data = resp.json()
                self.id_jadwal_list = [
                    j["id"] for j in data.get("data", []) if j.get("id_dosen") == self.id_dosen
                ]
                resp.success()
            except Exception:
                resp.failure("Gagal parse /jadwal/detail")

    @task(5)
    def buka_dashboard(self):
        if not self.id_dosen:
            return
        self.client.get(f"/dosen/{self.id_dosen}/ringkasan-absensi", name="/dosen/[id]/ringkasan-absensi")
        self.client.get("/mahasiswa", name="/mahasiswa [list utk dashboard]")
        self.client.get(f"/dosen/{self.id_dosen}", name="/dosen/[id]")

    @task(4)
    def buka_jadwal(self):
        if not self.id_dosen:
            return
        self.client.get("/jadwal/detail", name="/jadwal/detail")
        self.client.get(f"/kelas?id_dosen={self.id_dosen}", name="/kelas?id_dosen=[id]")
        self.client.get("/mata-kuliah", name="/mata-kuliah")

    @task(3)
    def buka_statistik(self):
        if not self.id_dosen:
            return
        self.client.get(f"/dosen/{self.id_dosen}/ringkasan-absensi", name="/dosen/[id]/ringkasan-absensi")
        self.client.get(f"/dosen/{self.id_dosen}/top-mahasiswa", name="/dosen/[id]/top-mahasiswa")
        self.client.get(f"/dosen/{self.id_dosen}/tren-kehadiran?hari=14", name="/dosen/[id]/tren-kehadiran")
        self.client.get(f"/dosen/{self.id_dosen}/kehadiran-per-matkul", name="/dosen/[id]/kehadiran-per-matkul")

    @task(3)
    def buka_data_absensi(self):
        if not self.id_jadwal_list:
            return
        id_jadwal = random.choice(self.id_jadwal_list)
        self.client.get(f"/absensi/jadwal/{id_jadwal}", name="/absensi/jadwal/[id]")

    @task(2)
    def kelola_anggota_kelas(self):
        if not self.id_dosen:
            return
        with self.client.get(
            f"/kelas?id_dosen={self.id_dosen}",
            name="/kelas?id_dosen=[id] [anggota]",
            catch_response=True,
        ) as resp:
            try:
                data = resp.json()
                kelas_list = data.get("data", [])
                resp.success()
            except Exception:
                resp.failure("Gagal parse /kelas")
                return
        if kelas_list:
            kelas = random.choice(kelas_list)
            self.client.get(f"/kelas/{kelas['id']}/anggota", name="/kelas/[id]/anggota")


# ============================================================
# ROLE: MAHASISWA (RINGAN)
# ============================================================

class MahasiswaRinganUser(HttpUser):
    host = HOST_DEFAULT
    weight = 5
    wait_time = between(3, 8)

    def on_start(self):
        akun = random.choice(MAHASISWA_ACCOUNTS)
        self.user = login(self.client, akun["email"], akun["password"], "/auth/login [mahasiswa]")
        self.id_mahasiswa = self.user["id"] if self.user else None

    @task(5)
    def buka_riwayat(self):
        if not self.id_mahasiswa:
            return
        self.client.get(f"/absensi/mahasiswa/{self.id_mahasiswa}", name="/absensi/mahasiswa/[id]")

    @task(4)
    def cek_jadwal(self):
        self.client.get("/jadwal", name="/jadwal")

    @task(3)
    def cek_status_hari_ini(self):
        if not self.id_mahasiswa:
            return
        self.client.get(f"/absensi/status-hari-ini/{self.id_mahasiswa}", name="/absensi/status-hari-ini/[id]")

    @task(3)
    def sinkron_waktu_server(self):
        self.client.get("/server-waktu", name="/server-waktu")

    @task(2)
    def cek_kelas(self):
        self.client.get("/kelas", name="/kelas [mahasiswa]")


# ============================================================
# ROLE: MAHASISWA (ABSENSI PENUH) -- alur terberat di backend
# ============================================================

class MahasiswaAbsensiUser(HttpUser):
    host = HOST_DEFAULT
    weight = 1
    wait_time = between(5, 15)

    def on_start(self):
        akun = random.choice(MAHASISWA_ACCOUNTS)
        self.user = login(
            self.client, akun["email"], akun["password"], "/auth/login [mahasiswa-absensi]"
        )
        self.id_mahasiswa = self.user["id"] if self.user else None
        self.id_jadwal_list = []
        if self.id_mahasiswa:
            self._muat_jadwal_diikuti()

    def _muat_jadwal_diikuti(self):
        with self.client.get(
            "/jadwal", name="/jadwal [absensi-flow]", catch_response=True
        ) as resp:
            try:
                data = resp.json()
                self.id_jadwal_list = [j["id"] for j in data.get("data", []) if j.get("id_kelas")]
                resp.success()
            except Exception:
                resp.failure("Gagal parse /jadwal")

    def _buat_frame_files(self, jumlah=6):
        img_bytes = get_sample_image_bytes()
        return [
            ("foto_list", (f"frame_{i}.jpg", io.BytesIO(img_bytes), "image/jpeg"))
            for i in range(jumlah)
        ]

    @task
    @tag("cv-heavy")
    def alur_gesture_challenge(self):
        if not self.id_jadwal_list:
            return
        id_jadwal = random.choice(self.id_jadwal_list)

        with self.client.get(
            f"/liveness/gesture-challenge?id_jadwal={id_jadwal}",
            name="/liveness/gesture-challenge",
            catch_response=True,
        ) as resp:
            try:
                data = resp.json()
            except Exception:
                resp.failure("Gagal parse gesture-challenge")
                return
            if resp.status_code != 200 or "token" not in data:
                resp.success()
                return
            resp.success()
            token = data["token"]
            jumlah_gesture = len(data.get("gestures", []))

        for gesture_index in range(max(jumlah_gesture, 1)):
            files = self._buat_frame_files()
            data_form = {
                "id_jadwal": str(id_jadwal),
                "id_mahasiswa": self.id_mahasiswa,
                "gesture_token": token,
                "gesture_index": str(gesture_index),
                "latitude": "1.1188560591870436",
                "longitude": "104.04843981451464",
                "accuracy": "10",
            }
            with self.client.post(
                "/absensi/foto",
                data=data_form,
                files=files,
                name="/absensi/foto [CV-HEAVY]",
                catch_response=True,
            ) as resp:
                if resp.status_code >= 500:
                    resp.failure(f"Server error {resp.status_code}")
                else:
                    resp.success()
                try:
                    body = resp.json()
                except Exception:
                    body = {}
                if not body.get("berhasil"):
                    break


# ============================================================
# EVENT HOOKS
# ============================================================

@events.quitting.add_listener
def _on_quitting(environment, **kwargs):
    stats = environment.stats.total
    print("\n===== RINGKASAN TEST LOKAL =====")
    print(f"Total request           : {stats.num_requests}")
    print(f"Total gagal             : {stats.num_failures}")
    print(f"Response time rata-rata  : {stats.avg_response_time:.0f} ms")
    print(f"Response time p95        : {stats.get_response_time_percentile(0.95):.0f} ms")
    print(f"Response time p99        : {stats.get_response_time_percentile(0.99):.0f} ms")
    print("===================================\n")