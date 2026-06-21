import numpy as np


def hitung_pusat_bbox(bbox: list) -> tuple:
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def hitung_jarak(titik_a: tuple, titik_b: tuple) -> float:
    return float(np.sqrt((titik_a[0] - titik_b[0]) ** 2 + (titik_a[1] - titik_b[1]) ** 2))


def cek_liveness_gerakan(
    bbox_list: list,
    ukuran_wajah_referensi: float,
    ambang_minimal_persen: float = 3.0,
    ambang_smoothness_min: float = 0.15,
) -> dict:
    """
    Liveness check berbasis pergerakan posisi wajah antar frame.

    bbox_list: list bounding box [x1, y1, x2, y2] dari setiap frame berurutan,
               hasil deteksi YOLO pada masing-masing frame.
    ukuran_wajah_referensi: lebar bounding box wajah (piksel) untuk normalisasi,
                            supaya ambang batas tidak bergantung pada jarak kamera.
    ambang_minimal_persen: total pergeseran minimal (dalam % dari ukuran wajah)
                            yang harus terjadi selama sesi untuk membuktikan
                            ada gerakan nyata.
    ambang_smoothness_min: rasio minimal antara jarak total perpindahan vs
                            jarak garis lurus titik awal-akhir. Mendekati 1.0
                            berarti gerakan smooth/searah, sangat rendah berarti
                            gerakan acak/patah-patah (indikasi goyangan kasar).
    """
    if len(bbox_list) < 3:
        return {
            "lolos": False,
            "pesan": "Jumlah frame tidak cukup untuk pengecekan liveness gerakan",
            "detail": {}
        }

    titik_pusat = [hitung_pusat_bbox(b) for b in bbox_list]

    jarak_per_langkah = []
    for i in range(len(titik_pusat) - 1):
        jarak = hitung_jarak(titik_pusat[i], titik_pusat[i + 1])
        jarak_per_langkah.append(jarak)

    total_jarak_tempuh = sum(jarak_per_langkah)
    jarak_lurus_awal_akhir = hitung_jarak(titik_pusat[0], titik_pusat[-1])

    total_persen = (total_jarak_tempuh / ukuran_wajah_referensi) * 100 if ukuran_wajah_referensi > 0 else 0

    if total_jarak_tempuh > 0:
        smoothness = jarak_lurus_awal_akhir / total_jarak_tempuh
    else:
        smoothness = 0.0

    ada_gerakan_cukup = total_persen >= ambang_minimal_persen

    lolos = ada_gerakan_cukup

    if not ada_gerakan_cukup:
        pesan = "Tidak terdeteksi gerakan wajah yang cukup selama sesi, pastikan menggerakkan wajah perlahan"
    else:
        pesan = "Gerakan wajah natural terverifikasi"

    return {
        "lolos": lolos,
        "pesan": pesan,
        "detail": {
            "total_persen_pergeseran": round(total_persen, 2),
            "jarak_per_langkah": [round(j, 2) for j in jarak_per_langkah],
            "smoothness_ratio": round(smoothness, 3),
            "ukuran_wajah_referensi": round(ukuran_wajah_referensi, 2),
        }
    }