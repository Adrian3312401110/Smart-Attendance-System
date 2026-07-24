import random
from locust import HttpUser, task, between

class SmartAttendanceUser(HttpUser):
    # Base host untuk backend API
    host = "http://localhost:8000"
    
    # Waktu tunggu antara setiap request oleh satu user (dalam detik)
    wait_time = between(1, 3)
    
    # Simpan token auth jika aplikasi menggunakan token,
    # Pada simulasi ini kita asumsikan stateless/session sederhana
    def on_start(self):
        """
        Dijalankan setiap kali user virtual baru disimulasikan.
        Biasanya digunakan untuk login dan mendapatkan token auth.
        """
        # Uncomment dan sesuaikan jika endpoint login menggunakan JSON body
        # res = self.client.post("/auth/login", json={
        #     "email": "dosen@polibatam.ac.id",
        #     "password": "PasswordDosen@123"
        # })
        # if res.status_code == 200:
        #     self.token = res.json().get("token")
        pass

    @task(3)
    def test_health_check(self):
        """Uji endpoint yang ringan, sering dipanggil."""
        self.client.get("/health", name="Health Check")
        self.client.get("/", name="Root Endpoint")

    @task(2)
    def test_lihat_semua_mahasiswa(self):
        """Uji melihat daftar seluruh mahasiswa."""
        self.client.get("/mahasiswa", name="Lihat Daftar Mahasiswa")
        
    @task(1)
    def test_cari_mahasiswa_spesifik(self):
        """Uji pencarian mahasiswa spesifik, ambil dari ID sampel acak."""
        # Gunakan ID acak untuk menyimulasikan akses database bervariasi
        sample_ids = ["M001", "M002", "M003", "M004", "M005"]
        mhs_id = random.choice(sample_ids)
        
        with self.client.get(f"/mahasiswa/{mhs_id}", name="Lihat Detail Mahasiswa", catch_response=True) as response:
            # 404 dianggap OK dalam tes ini jika ID belum terdaftar
            if response.status_code in (200, 404):
                response.success()

    @task(1)
    def test_simulasi_absensi(self):
        """Uji pengambilan riwayat absensi."""
        sample_ids = ["M001", "M002"]
        mhs_id = random.choice(sample_ids)
        self.client.get(f"/absensi/mahasiswa/{mhs_id}", name="Riwayat Absensi")

    # Opsional: Jika ingin menambahkan test operasi tulis (POST/PUT),
    # pastikan menggunakan data yang aman agar tidak merusak database produksi.
