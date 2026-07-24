"""
test_api_auth.py — Integration test untuk endpoint otentikasi (/auth/*).

Semua test menggunakan SQLite in-memory (via conftest.py), sehingga
database produksi tidak tersentuh sama sekali.

Test cases yang dicakup:
  TC-001A  Login valid (Dosen)
  TC-001B  Login invalid — email tidak terdaftar
  TC-001C  Login invalid — password salah
  TC-001D  Login invalid — domain email salah (typo)
  TC-002A  Register valid (Dosen)
  TC-002B  Register gagal — email sudah terdaftar
  TC-002C  Register gagal — domain email salah
  TC-002D  Register gagal — password terlalu pendek
  TC-002E  Register gagal — password tanpa simbol
  TC-002F  Register gagal — role tidak valid
  TC-003A  Change password valid
  TC-003B  Change password gagal — password lama salah
"""

import pytest
from backend.models import UserAccount
from backend.main import hash_password


# ─────────────────────────────────────────────
# Helper: buat user langsung di DB test
# ─────────────────────────────────────────────

def buat_user(db_session, email: str, password: str, role: str = "dosen",
              user_id: str = "D001", nama: str = "Dosen Test"):
    user = UserAccount(
        email=email,
        password_hash=hash_password(password),
        role=role,
        user_id=user_id,
        nama=nama,
    )
    db_session.add(user)
    db_session.commit()
    return user


# ============================================================
# TC-001 — LOGIN
# ============================================================

class TestLogin:

    # TC-001A: Login dengan email & password yang benar
    def test_login_valid_dosen(self, client, db_session):
        buat_user(db_session, "dosen@polibatam.ac.id", "RahasiaDosen@123")
        res = client.post("/auth/login", json={
            "email": "dosen@polibatam.ac.id",
            "password": "RahasiaDosen@123"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["berhasil"] is True
        assert data["user"]["role"] == "dosen"

    # TC-001A variant: Login mahasiswa
    def test_login_valid_mahasiswa(self, client, db_session):
        buat_user(db_session, "mhs@gmail.com", "RahasiaMhs@456",
                  role="mahasiswa", user_id="M001", nama="Mhs Test")
        res = client.post("/auth/login", json={
            "email": "mhs@gmail.com",
            "password": "RahasiaMhs@456"
        })
        assert res.status_code == 200
        assert res.json()["user"]["role"] == "mahasiswa"

    # TC-001B: Email tidak terdaftar
    def test_login_email_tidak_terdaftar(self, client, db_session):
        res = client.post("/auth/login", json={
            "email": "tidakada@gmail.com",
            "password": "Apapun@12345"
        })
        assert res.status_code == 401
        assert res.json()["berhasil"] is False

    # TC-001C: Password salah
    def test_login_password_salah(self, client, db_session):
        buat_user(db_session, "dosen@polibatam.ac.id", "PasswordBenar@123")
        res = client.post("/auth/login", json={
            "email": "dosen@polibatam.ac.id",
            "password": "PasswordSalah@999"
        })
        assert res.status_code == 401

    # TC-001D: Domain email salah (typo gmail → gmil)
    def test_login_domain_email_typo(self, client, db_session):
        res = client.post("/auth/login", json={
            "email": "mhs@gmil.com",
            "password": "Apapun@12345"
        })
        # Harus 400 (domain ditolak) bukan 401
        assert res.status_code == 400
        assert "gmil.com" in res.json()["pesan"]

    # TC-001D variant: polibatam.ac (tanpa .id)
    def test_login_domain_polibatam_typo(self, client, db_session):
        res = client.post("/auth/login", json={
            "email": "dosen@polibatam.ac",
            "password": "Apapun@12345"
        })
        assert res.status_code == 400

    # Field kosong
    def test_login_field_kosong(self, client, db_session):
        res = client.post("/auth/login", json={"email": "", "password": ""})
        assert res.status_code == 400


# ============================================================
# TC-002 — REGISTER (JSON endpoint / Dosen)
# ============================================================

class TestRegister:

    PAYLOAD_VALID = {
        "email": "dosen@polibatam.ac.id",
        "password": "Rahasia@Dosen123",
        "role": "dosen",
        "user_id": "D001",
        "nama": "Dosen Test",
    }

    # TC-002A: Register valid
    def test_register_valid(self, client, db_session):
        res = client.post("/auth/register", json=self.PAYLOAD_VALID)
        assert res.status_code == 200
        data = res.json()
        assert data["berhasil"] is True
        assert data["user"]["email"] == "dosen@polibatam.ac.id"

    # TC-002B: Email sudah terdaftar
    def test_register_email_duplikat(self, client, db_session):
        client.post("/auth/register", json=self.PAYLOAD_VALID)
        res = client.post("/auth/register", json=self.PAYLOAD_VALID)
        assert res.status_code == 400
        assert "terdaftar" in res.json()["pesan"].lower()

    # TC-002C: Domain email salah
    def test_register_domain_email_salah(self, client, db_session):
        payload = {**self.PAYLOAD_VALID, "email": "dosen@gmil.com"}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400
        assert "gmil.com" in res.json()["pesan"]

    # TC-002C variant: polibatam.ac tanpa .id
    def test_register_domain_polibatam_tanpa_id(self, client, db_session):
        payload = {**self.PAYLOAD_VALID, "email": "dosen@polibatam.ac"}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400

    # TC-002D: Password terlalu pendek (< 12 karakter)
    def test_register_password_terlalu_pendek(self, client, db_session):
        payload = {**self.PAYLOAD_VALID, "password": "Pendek@1"}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400

    # TC-002E: Password tanpa simbol
    def test_register_password_tanpa_simbol(self, client, db_session):
        payload = {**self.PAYLOAD_VALID, "password": "TanpaSimbol123456"}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400

    # TC-002F: Role tidak valid
    def test_register_role_tidak_valid(self, client, db_session):
        payload = {**self.PAYLOAD_VALID, "role": "admin"}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 400

    # Field wajib kosong
    def test_register_field_kosong(self, client, db_session):
        res = client.post("/auth/register", json={
            "email": "", "password": "", "role": "dosen",
            "user_id": "", "nama": ""
        })
        assert res.status_code == 400


# ============================================================
# TC-003 — CHANGE PASSWORD
# ============================================================

class TestChangePassword:

    def test_ganti_password_valid(self, client, db_session):
        """TC-003A: Ganti password dengan data yang benar."""
        buat_user(db_session, "dosen@polibatam.ac.id", "OldPwd@Rahasia1")
        res = client.post("/auth/change-password", json={
            "email": "dosen@polibatam.ac.id",
            "password_lama": "OldPwd@Rahasia1",
            "password_baru": "NewPwd@Rahasia2",
        })
        assert res.status_code == 200
        assert res.json()["berhasil"] is True

        # Verifikasi: login dengan password baru harus berhasil
        login_res = client.post("/auth/login", json={
            "email": "dosen@polibatam.ac.id",
            "password": "NewPwd@Rahasia2"
        })
        assert login_res.status_code == 200

    def test_ganti_password_lama_salah(self, client, db_session):
        """TC-003B: Ganti password gagal karena password lama salah."""
        buat_user(db_session, "dosen@polibatam.ac.id", "OldPwd@Rahasia1")
        res = client.post("/auth/change-password", json={
            "email": "dosen@polibatam.ac.id",
            "password_lama": "SalahSekali@99",
            "password_baru": "NewPwd@Rahasia2",
        })
        assert res.status_code == 400 or res.status_code == 401
        assert res.json()["berhasil"] is False


# ============================================================
# TC-004 — ENDPOINT KESEHATAN (Health Check)
# ============================================================

class TestHealthEndpoint:

    def test_root_berjalan(self, client, db_session):
        """GET / harus mengembalikan status aplikasi."""
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert "aplikasi" in data
        assert data["status"] == "berjalan"

    def test_health_ok(self, client, db_session):
        """GET /health harus mengembalikan {'status': 'ok'}."""
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
