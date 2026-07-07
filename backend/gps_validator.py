import math
import time
from typing import Optional

# Koordinat kampus Polibatam
KAMPUS_LAT = 1.1310965551577679
KAMPUS_LON = 104.05043181230597
RADIUS_KAMPUS_METER = 200  # radius toleransi dalam meter

# Batas akurasi GPS yang dianggap wajar (meter)
# GPS asli biasanya 5-50m. Di bawah 3m sangat mencurigakan.
AKURASI_MIN_WAJAR = 3.0
AKURASI_MAX_WAJAR = 150.0

# Kecepatan maksimal manusia yang wajar (m/s) — lari sprint ~10 m/s
KECEPATAN_MAKS_MS = 12.0

# Riwayat lokasi per mahasiswa (in-memory, key: id_mahasiswa)
# Value: {"lat": float, "lon": float, "timestamp": float}
riwayat_lokasi: dict = {}


def hitung_jarak_meter(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Hitung jarak antara dua koordinat GPS menggunakan formula Haversine.
    Mengembalikan jarak dalam meter.
    """
    R = 6371000  # radius bumi dalam meter

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def cek_radius_lokasi(lat: float, lon: float, target_lat: float, target_lon: float,
                       radius_meter: float = RADIUS_KAMPUS_METER) -> dict:
    """
    Cek apakah koordinat berada dalam radius dari sebuah titik target
    (misal: lokasi kelas yang ditandai dosen di peta).
    """
    jarak = hitung_jarak_meter(lat, lon, target_lat, target_lon)
    dalam_radius = jarak <= radius_meter

    return {
        "lolos": dalam_radius,
        "jarak_meter": round(jarak, 1),
        "radius_kampus": radius_meter,
        "alasan": (
            f"Dalam radius lokasi kelas ({round(jarak, 1)}m dari titik yang ditentukan)"
            if dalam_radius else
            f"Di luar radius lokasi kelas — jarak {round(jarak, 1)}m (maks: {radius_meter}m)"
        )
    }

def cek_akurasi_gps(accuracy: float) -> dict:
    """
    Cek apakah nilai akurasi GPS masuk akal.
    Akurasi terlalu sempurna (< 3m) atau terlalu buruk (> 150m) mencurigakan.
    """
    if accuracy <= 0:
        return {
            "lolos": False,
            "accuracy": accuracy,
            "alasan": "Nilai akurasi GPS tidak valid (0 atau negatif) — indikasi GPS palsu"
        }

    if accuracy < AKURASI_MIN_WAJAR:
        return {
            "lolos": False,
            "accuracy": accuracy,
            "alasan": f"Akurasi GPS terlalu sempurna ({accuracy}m) — GPS asli tidak mungkin seakurat ini, indikasi fake GPS"
        }

    if accuracy > AKURASI_MAX_WAJAR:
        return {
            "lolos": False,
            "accuracy": accuracy,
            "alasan": f"Akurasi GPS terlalu buruk ({accuracy}m) — sinyal tidak cukup kuat untuk validasi lokasi"
        }

    return {
        "lolos": True,
        "accuracy": accuracy,
        "alasan": f"Akurasi GPS wajar ({accuracy}m)"
    }


def cek_kecepatan_perpindahan(
    id_mahasiswa: str,
    lat: float,
    lon: float,
    timestamp_sekarang: Optional[float] = None
) -> dict:
    """
    Cek apakah perpindahan dari lokasi absen terakhir masuk akal secara fisik.
    """
    if timestamp_sekarang is None:
        timestamp_sekarang = time.time()

    riwayat = riwayat_lokasi.get(id_mahasiswa)

    if riwayat is None:
        # Belum ada riwayat — simpan dan loloskan
        riwayat_lokasi[id_mahasiswa] = {
            "lat": lat,
            "lon": lon,
            "timestamp": timestamp_sekarang
        }
        return {
            "lolos": True,
            "alasan": "Tidak ada riwayat lokasi sebelumnya — lokasi pertama disimpan",
            "kecepatan_ms": None
        }

    jarak = hitung_jarak_meter(riwayat["lat"], riwayat["lon"], lat, lon)
    selisih_waktu = timestamp_sekarang - riwayat["timestamp"]

    if selisih_waktu <= 0:
        return {
            "lolos": False,
            "alasan": "Timestamp tidak valid",
            "kecepatan_ms": None
        }

    kecepatan_ms = jarak / selisih_waktu

    if kecepatan_ms > KECEPATAN_MAKS_MS:
        return {
            "lolos": False,
            "alasan": f"Perpindahan lokasi tidak wajar — kecepatan {round(kecepatan_ms, 1)} m/s ({round(kecepatan_ms * 3.6, 1)} km/h) tidak mungkin bagi manusia",
            "kecepatan_ms": round(kecepatan_ms, 2)
        }

    # Update riwayat
    riwayat_lokasi[id_mahasiswa] = {
        "lat": lat,
        "lon": lon,
        "timestamp": timestamp_sekarang
    }

    return {
        "lolos": True,
        "alasan": f"Kecepatan perpindahan wajar ({round(kecepatan_ms, 1)} m/s)",
        "kecepatan_ms": round(kecepatan_ms, 2)
    }


def cek_altitude(altitude: Optional[float]) -> dict:
    """
    Cek apakah altitude masuk akal untuk lokasi kampus Polibatam.
    Batam berada di ~0-50m di atas permukaan laut.
    Fake GPS sering set altitude = 0.0 persis atau nilai tidak wajar.
    """
    if altitude is None:
        # Browser kadang tidak sediakan altitude — tidak blokir, tapi catat
        return {
            "lolos": True,
            "altitude": None,
            "alasan": "Data altitude tidak tersedia dari browser — dilewati"
        }

    if altitude == 0.0:
        return {
            "lolos": False,
            "altitude": altitude,
            "alasan": "Altitude persis 0.0m — indikasi nilai default fake GPS"
        }

    if altitude < -100 or altitude > 500:
        return {
            "lolos": False,
            "altitude": altitude,
            "alasan": f"Altitude tidak wajar ({altitude}m) untuk lokasi kampus"
        }

    return {
        "lolos": True,
        "altitude": altitude,
        "alasan": f"Altitude wajar ({altitude}m)"
    }


def validasi_gps_lengkap(
    id_mahasiswa: str,
    lat: float,
    lon: float,
    accuracy: float,
    target_lat: float = KAMPUS_LAT,
    target_lon: float = KAMPUS_LON,
    radius_meter: float = RADIUS_KAMPUS_METER,
    altitude: Optional[float] = None,
    timestamp: Optional[float] = None
) -> dict:
    """
    Jalankan semua 4 validasi GPS dan kembalikan hasil gabungan.
    target_lat/target_lon = lokasi kelas yang ditandai dosen di peta.
    """
    hasil_radius    = cek_radius_lokasi(lat, lon, target_lat, target_lon, radius_meter)
    hasil_akurasi   = cek_akurasi_gps(accuracy)
    hasil_kecepatan = cek_kecepatan_perpindahan(id_mahasiswa, lat, lon, timestamp)
    hasil_altitude  = cek_altitude(altitude)

    semua_lolos = (
        hasil_radius["lolos"] and
        hasil_akurasi["lolos"] and
        hasil_kecepatan["lolos"] and
        hasil_altitude["lolos"]
    )

    gagal_list = []
    if not hasil_radius["lolos"]:
        gagal_list.append(hasil_radius["alasan"])
    if not hasil_akurasi["lolos"]:
        gagal_list.append(hasil_akurasi["alasan"])
    if not hasil_kecepatan["lolos"]:
        gagal_list.append(hasil_kecepatan["alasan"])
    if not hasil_altitude["lolos"]:
        gagal_list.append(hasil_altitude["alasan"])

    return {
        "lolos": semua_lolos,
        "pesan": "Lokasi terverifikasi" if semua_lolos else " | ".join(gagal_list),
        "detail": {
            "radius_kampus": hasil_radius,
            "akurasi_gps":   hasil_akurasi,
            "kecepatan":     hasil_kecepatan,
            "altitude":      hasil_altitude,
        }
    }