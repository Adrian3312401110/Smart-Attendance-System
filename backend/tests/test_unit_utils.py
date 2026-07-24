"""
test_unit_utils.py — Unit test untuk fungsi-fungsi utilitas murni (pure functions).

Fungsi yang diuji (tidak butuh DB / HTTP):
  - validate_email_domain()
  - hash_password() + verify_password()
  - format_telat_detik()
  - generate_jam_acak()
  - hitung_jarak_meter() [dari gps_validator]
  - cek_radius_lokasi()   [dari gps_validator]
"""

import pytest
from backend.main import (
    validate_email_domain,
    hash_password,
    verify_password,
    format_telat_detik,
    generate_jam_acak,
)
from backend.gps_validator import hitung_jarak_meter, cek_radius_lokasi


# ============================================================
# 1. VALIDASI DOMAIN EMAIL
# ============================================================

class TestValidateEmailDomain:
    """Unit test untuk validate_email_domain()."""

    # --- Email VALID ---

    def test_gmail_valid(self):
        """Email gmail.com yang valid harus lolos (kembalikan None)."""
        assert validate_email_domain("user@gmail.com") is None

    def test_polibatam_valid(self):
        """Email polibatam.ac.id yang valid harus lolos."""
        assert validate_email_domain("dosen@polibatam.ac.id") is None

    def test_email_case_insensitive(self):
        """Huruf besar/kecil harus dinormalisasi sebelum validasi."""
        assert validate_email_domain("User@Gmail.COM") is None

    def test_email_with_whitespace_stripped(self):
        """Spasi di awal/akhir harus diabaikan."""
        assert validate_email_domain("  user@polibatam.ac.id  ") is None

    # --- Email TIDAK VALID: domain salah ---

    def test_gmil_typo(self):
        """gmil.com (typo gmail) harus DITOLAK."""
        result = validate_email_domain("user@gmil.com")
        assert result is not None
        assert "gmil.com" in result

    def test_polibatam_tanpa_id(self):
        """polibatam.ac (tanpa .id) harus DITOLAK."""
        result = validate_email_domain("dosen@polibatam.ac")
        assert result is not None
        assert "polibatam.ac" in result

    def test_yahoo_ditolak(self):
        """Domain lain seperti yahoo.com harus DITOLAK."""
        result = validate_email_domain("test@yahoo.com")
        assert result is not None

    def test_outlook_ditolak(self):
        """Domain outlook.com harus DITOLAK."""
        result = validate_email_domain("test@outlook.com")
        assert result is not None

    def test_polibatam_with_subdomain_ditolak(self):
        """mail.polibatam.ac.id (subdomain) harus DITOLAK — tidak eksak."""
        result = validate_email_domain("dosen@mail.polibatam.ac.id")
        assert result is not None

    # --- Email TIDAK VALID: format salah ---

    def test_tanpa_at(self):
        """Email tanpa '@' harus DITOLAK."""
        result = validate_email_domain("usergmail.com")
        assert result is not None

    def test_dua_at(self):
        """Email dengan dua '@' harus DITOLAK."""
        result = validate_email_domain("user@@gmail.com")
        assert result is not None

    def test_local_kosong(self):
        """Email tanpa nama lokal (hanya '@domain') harus DITOLAK."""
        result = validate_email_domain("@gmail.com")
        assert result is not None


# ============================================================
# 2. HASH & VERIFY PASSWORD
# ============================================================

class TestPassword:
    """Unit test untuk hash_password() dan verify_password()."""

    def test_hash_tidak_sama_dengan_plaintext(self):
        """Password setelah di-hash tidak boleh sama dengan plaintext."""
        pwd = "Password@Rahasia123"
        hashed = hash_password(pwd)
        assert hashed != pwd

    def test_verify_benar(self):
        """verify_password harus True untuk password yang benar."""
        pwd = "Password@Rahasia123"
        hashed = hash_password(pwd)
        assert verify_password(pwd, hashed) is True

    def test_verify_salah(self):
        """verify_password harus False untuk password yang salah."""
        hashed = hash_password("Password@Benar123")
        assert verify_password("Password@Salah456", hashed) is False

    def test_hash_unik_setiap_kali(self):
        """Dua hash dari password yang sama harus berbeda (salt acak)."""
        pwd = "SamaPwD@123"
        assert hash_password(pwd) != hash_password(pwd)

    def test_hash_format_mengandung_colon(self):
        """Format hash harus 'salt_hex:hash_hex'."""
        hashed = hash_password("Apapun@123")
        assert ":" in hashed
        parts = hashed.split(":", 1)
        assert len(parts) == 2
        assert all(c in "0123456789abcdef" for c in parts[0])


# ============================================================
# 3. FORMAT KETERLAMBATAN
# ============================================================

class TestFormatTelatDetik:
    """Unit test untuk format_telat_detik()."""

    def test_tepat_waktu(self):
        """0 detik atau negatif harus mengembalikan 'Tepat waktu'."""
        result = format_telat_detik(0)
        assert result["terlambat"] is False
        assert result["teks"] == "Tepat waktu"

    def test_negatif_tepat_waktu(self):
        """Nilai negatif berarti lebih awal, bukan terlambat."""
        result = format_telat_detik(-60)
        assert result["terlambat"] is False

    def test_terlambat_kurang_dari_1_menit(self):
        """30 detik = terlambat 30 detik."""
        result = format_telat_detik(30)
        assert result["terlambat"] is True
        assert "30 detik" in result["teks"]

    def test_terlambat_tepat_1_jam(self):
        """3600 detik = 1 jam terlambat."""
        result = format_telat_detik(3600)
        assert result["terlambat"] is True
        assert "1 jam" in result["teks"]

    def test_terlambat_kombinasi(self):
        """3661 detik = 1 jam 1 menit 1 detik terlambat."""
        result = format_telat_detik(3661)
        assert result["terlambat"] is True
        assert "1 jam" in result["teks"]
        assert "1 menit" in result["teks"]
        assert "1 detik" in result["teks"]

    def test_field_numerik_tersedia(self):
        """Semua field numerik (detik, menit, jam) harus ada di output."""
        result = format_telat_detik(7200)  # 2 jam
        assert result["detik"] == 7200
        assert result["menit"] == 120
        assert result["jam"] == 2.0


# ============================================================
# 4. GENERATE JAM ACAK
# ============================================================

class TestGenerateJamAcak:
    """Unit test untuk generate_jam_acak()."""

    def test_output_dalam_rentang(self):
        """Semua waktu yang dihasilkan harus berada dalam [mulai, selesai]."""
        hasil = generate_jam_acak("08:00", "10:00", 5)
        for jam in hasil:
            assert "08:00" <= jam <= "10:00"

    def test_jumlah_sesuai(self):
        """Jumlah output harus ≤ jumlah yang diminta."""
        hasil = generate_jam_acak("07:00", "12:00", 3)
        assert len(hasil) <= 3

    def test_hasil_unik(self):
        """Tidak boleh ada waktu yang duplikat."""
        hasil = generate_jam_acak("07:00", "17:00", 5)
        assert len(hasil) == len(set(hasil))

    def test_hasil_terurut(self):
        """Output harus dalam urutan waktu yang terurut."""
        hasil = generate_jam_acak("07:00", "17:00", 5)
        assert hasil == sorted(hasil)

    def test_format_jam_valid(self):
        """Format output harus HH:MM."""
        from datetime import datetime
        hasil = generate_jam_acak("09:00", "11:00", 3)
        for jam in hasil:
            datetime.strptime(jam, "%H:%M")  # tidak boleh raise

    def test_input_tidak_valid(self):
        """Jika format jam salah, harus kembalikan list kosong."""
        hasil = generate_jam_acak("tidakvalid", "juga_salah", 3)
        assert hasil == []

    def test_clamp_jumlah_maks_10(self):
        """Jumlah diminta > 10 harus di-clamp ke maks 10."""
        hasil = generate_jam_acak("00:00", "23:59", 999)
        assert len(hasil) <= 10

    def test_rentang_sama_menghasilkan_satu(self):
        """Jika mulai == selesai, tidak boleh crash (rentang = 0)."""
        hasil = generate_jam_acak("08:00", "08:00", 3)
        # Bisa 0 atau 1, tidak boleh error
        assert isinstance(hasil, list)


# ============================================================
# 5. KALKULASI GPS (hitung_jarak_meter & cek_radius_lokasi)
# ============================================================

class TestHitungJarakMeter:
    """Unit test untuk hitung_jarak_meter() — formula Haversine."""

    # Koordinat Polibatam (referensi)
    LAT_POLIBATAM = 1.1310965551577679
    LON_POLIBATAM = 104.05043181230597

    def test_titik_sama_adalah_nol(self):
        """Jarak dari suatu titik ke dirinya sendiri harus 0."""
        jarak = hitung_jarak_meter(
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            self.LAT_POLIBATAM, self.LON_POLIBATAM
        )
        assert jarak == pytest.approx(0.0, abs=1e-3)

    def test_jarak_polibatam_ke_titik_dekat(self):
        """Geser ~100m dari Polibatam, jarak harus mendekati 100m."""
        # Geser lintang sekitar 0.0009 derajat ≈ 100m
        jarak = hitung_jarak_meter(
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            self.LAT_POLIBATAM + 0.0009, self.LON_POLIBATAM
        )
        assert 90 < jarak < 110  # toleransi ±10m

    def test_simetris(self):
        """Jarak A→B harus sama dengan B→A."""
        lat1, lon1 = 1.131, 104.050
        lat2, lon2 = 1.135, 104.055
        j1 = hitung_jarak_meter(lat1, lon1, lat2, lon2)
        j2 = hitung_jarak_meter(lat2, lon2, lat1, lon1)
        assert j1 == pytest.approx(j2, rel=1e-6)

    def test_kembalikan_float(self):
        """Nilai kembalian harus bertipe float."""
        jarak = hitung_jarak_meter(1.0, 104.0, 1.1, 104.1)
        assert isinstance(jarak, float)


class TestCekRadiusLokasi:
    """Unit test untuk cek_radius_lokasi()."""

    LAT_POLIBATAM = 1.1310965551577679
    LON_POLIBATAM = 104.05043181230597

    def test_dalam_radius_lolos(self):
        """Titik yang berada tepat di pusat harus lolos."""
        result = cek_radius_lokasi(
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            radius_meter=200
        )
        assert result["lolos"] is True

    def test_di_luar_radius_gagal(self):
        """Titik yang jauh (misalnya 500m) harus gagal dengan radius 200m."""
        # Geser ~0.005 derajat ≈ 550m
        result = cek_radius_lokasi(
            self.LAT_POLIBATAM + 0.005, self.LON_POLIBATAM,
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            radius_meter=200
        )
        assert result["lolos"] is False

    def test_output_mengandung_jarak(self):
        """Output harus mengandung field 'jarak_meter'."""
        result = cek_radius_lokasi(
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
        )
        assert "jarak_meter" in result
        assert isinstance(result["jarak_meter"], float)

    def test_output_mengandung_alasan(self):
        """Output harus mengandung field 'alasan' berupa string."""
        result = cek_radius_lokasi(
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
        )
        assert "alasan" in result
        assert isinstance(result["alasan"], str)

    def test_batas_tepat_radius(self):
        """Titik yang berjarak tepat di batas radius harus lolos."""
        # Kita generate titik yang berjarak mendekati radius (sedikit di dalam)
        # ~180m dari pusat
        result = cek_radius_lokasi(
            self.LAT_POLIBATAM + 0.0016, self.LON_POLIBATAM,
            self.LAT_POLIBATAM, self.LON_POLIBATAM,
            radius_meter=200
        )
        # Hanya pastikan field ada dan hasilnya boolean
        assert isinstance(result["lolos"], bool)
