"""
test_api_mahasiswa.py — Integration test untuk endpoint CRUD Mahasiswa.

Test cases yang dicakup:
  TC-006A  Tambah mahasiswa — ID sudah ada → 400
  TC-006B  Tambah mahasiswa — data baru valid → 200
  TC-007A  Update mahasiswa — ID tidak ditemukan → 404
  TC-007B  Update mahasiswa — data valid → 200
  TC-008A  Hapus mahasiswa (endpoint belum ada → xfail)
  TC-009A  Lihat semua mahasiswa → 200
  TC-009B  Lihat satu mahasiswa by ID → 200
  TC-009C  Lihat mahasiswa yang tidak ada → 404
  TC-010A  Pencarian data absensi mahasiswa → 200
"""

import pytest


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────

def tambah_mahasiswa(client, id_mhs="M001", nama="Budi", email="budi@gmail.com", angkatan="2023"):
    return client.post("/mahasiswa", data={
        "id_mahasiswa": id_mhs,
        "nama_mahasiswa": nama,
        "email": email,
        "angkatan": angkatan,
    })


# ============================================================
# TC-006 — TAMBAH MAHASISWA
# ============================================================

class TestTambahMahasiswa:

    def test_tambah_mahasiswa_baru(self, client, db_session):
        """TC-006B: Tambah mahasiswa dengan data baru yang valid."""
        res = tambah_mahasiswa(client)
        assert res.status_code == 200
        assert res.json()["berhasil"] is True
        assert res.json()["data"]["id_mahasiswa"] == "M001"

    def test_tambah_mahasiswa_duplicate_id(self, client, db_session):
        """TC-006A: Tambah mahasiswa dengan ID yang sudah ada harus gagal 400."""
        tambah_mahasiswa(client, id_mhs="M001")
        res = tambah_mahasiswa(client, id_mhs="M001", email="budi2@gmail.com")
        assert res.status_code == 400
        assert "terdaftar" in res.json()["pesan"].lower()

    def test_tambah_mahasiswa_berbeda_id(self, client, db_session):
        """Dua mahasiswa dengan ID berbeda harus bisa ditambah keduanya."""
        r1 = tambah_mahasiswa(client, id_mhs="M001", email="m1@gmail.com")
        r2 = tambah_mahasiswa(client, id_mhs="M002", email="m2@gmail.com")
        assert r1.status_code == 200
        assert r2.status_code == 200


# ============================================================
# TC-007 — UPDATE MAHASISWA
# ============================================================

class TestUpdateMahasiswa:

    def test_update_mahasiswa_valid(self, client, db_session):
        """TC-007B: Update mahasiswa dengan data yang valid."""
        tambah_mahasiswa(client, id_mhs="M001")
        res = client.put("/mahasiswa/M001", data={
            "nama_mahasiswa": "Budi Updated",
            "email": "budi_new@gmail.com",
            "angkatan": "2024",
        })
        assert res.status_code == 200
        assert res.json()["data"]["nama_mahasiswa"] == "Budi Updated"

    def test_update_mahasiswa_tidak_ditemukan(self, client, db_session):
        """TC-007A: Update mahasiswa dengan ID yang tidak ada harus 404."""
        res = client.put("/mahasiswa/TIDAKADA", data={
            "nama_mahasiswa": "Siapapun",
            "email": "x@gmail.com",
            "angkatan": "2023",
        })
        assert res.status_code == 404

    def test_update_mengubah_nama(self, client, db_session):
        """Update nama harus tersimpan dan bisa dibaca kembali."""
        tambah_mahasiswa(client, id_mhs="M001")
        client.put("/mahasiswa/M001", data={
            "nama_mahasiswa": "Nama Baru",
            "email": "x@gmail.com",
            "angkatan": "2022",
        })
        res = client.get("/mahasiswa/M001")
        assert res.status_code == 200
        assert res.json()["nama_mahasiswa"] == "Nama Baru"


# ============================================================
# TC-008 — HAPUS MAHASISWA
# ============================================================

class TestHapusMahasiswa:

    def test_hapus_mahasiswa(self, client, db_session):
        """TC-008A: Hapus mahasiswa berhasil."""
        tambah_mahasiswa(client, id_mhs="M001")
        res = client.delete("/mahasiswa/M001")
        assert res.status_code == 200
        assert res.json()["berhasil"] is True

        # Pastikan data terhapus
        res_get = client.get("/mahasiswa/M001")
        assert res_get.status_code == 404

    def test_hapus_mahasiswa_tidak_ditemukan(self, client, db_session):
        """Hapus mahasiswa yang tidak ada harus gagal 404."""
        res = client.delete("/mahasiswa/TIDAKADA")
        assert res.status_code == 404
        assert res.json()["berhasil"] is False


# ============================================================
# TC-009 — LIHAT DATA MAHASISWA (DASHBOARD)
# ============================================================

class TestLihatMahasiswa:

    def test_lihat_semua_mahasiswa(self, client, db_session):
        """TC-009A: GET /mahasiswa harus kembalikan daftar + total."""
        tambah_mahasiswa(client, id_mhs="M001", email="m1@gmail.com")
        tambah_mahasiswa(client, id_mhs="M002", email="m2@gmail.com")
        res = client.get("/mahasiswa")
        assert res.status_code == 200
        data = res.json()
        assert "total" in data
        assert data["total"] == 2

    def test_lihat_mahasiswa_by_id(self, client, db_session):
        """TC-009B: GET /mahasiswa/{id} harus kembalikan data mahasiswa spesifik."""
        tambah_mahasiswa(client, id_mhs="M001", nama="Budi Santoso")
        res = client.get("/mahasiswa/M001")
        assert res.status_code == 200
        data = res.json()
        assert data["id_mahasiswa"] == "M001"
        assert data["nama_mahasiswa"] == "Budi Santoso"

    def test_lihat_mahasiswa_tidak_ditemukan(self, client, db_session):
        """TC-009C: GET /mahasiswa/{id} dengan ID tidak ada harus 404."""
        res = client.get("/mahasiswa/TIDAKADA")
        assert res.status_code == 404

    def test_lihat_semua_mahasiswa_kosong(self, client, db_session):
        """GET /mahasiswa tanpa data harus kembalikan total=0."""
        res = client.get("/mahasiswa")
        assert res.status_code == 200
        assert res.json()["total"] == 0


# ============================================================
# TC-010 — PENCARIAN DATA ABSENSI MAHASISWA
# ============================================================

class TestAbsensiMahasiswa:

    def test_lihat_absensi_mahasiswa(self, client, db_session):
        """TC-010A: GET /absensi/mahasiswa/{id} harus kembalikan 200."""
        # Mahasiswa tanpa absensi pun harus kembalikan 200 (list kosong)
        tambah_mahasiswa(client, id_mhs="M001")
        res = client.get("/absensi/mahasiswa/M001")
        assert res.status_code == 200

    def test_lihat_absensi_mahasiswa_tidak_terdaftar(self, client, db_session):
        """TC-010B: Absensi mahasiswa yang tidak ada — endpoint harus menangani."""
        res = client.get("/absensi/mahasiswa/TIDAKADA")
        # 200 (list kosong) atau 404, keduanya valid
        assert res.status_code in [200, 404]
