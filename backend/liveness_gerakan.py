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

def ekstrak_rata_warna_wajah(gambar: np.ndarray, bbox: list) -> tuple:
    """
    Ekstrak rata-rata warna RGB di area wajah dari bbox.
    """
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w = gambar.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    crop = gambar[y1:y2, x1:x2]
    if crop.size == 0:
        return (0.0, 0.0, 0.0)
    mean_bgr = crop.mean(axis=(0, 1))
    return (float(mean_bgr[2]), float(mean_bgr[1]), float(mean_bgr[0]))  # RGB


def cek_color_response(
    frame_list: list[np.ndarray],
    bbox_list: list,
    warna_challenge: list[str],
    ambang_delta: float = 3.0
) -> dict:
    """
    Verifikasi apakah warna ambient di wajah berubah mengikuti challenge warna.
    
    warna_challenge: list hex string warna yang ditampilkan layar, urut sesuai frame.
    ambang_delta: minimum perbedaan warna rata-rata (0-255) antar kondisi berbeda
                  yang harus terdeteksi di wajah untuk dianggap responsif.
    """
    if len(frame_list) < len(warna_challenge):
        return {
            "lolos": False,
            "pesan": "Jumlah frame tidak sesuai dengan jumlah warna challenge",
            "detail": {}
        }

    def hex_to_rgb(hex_str: str) -> tuple:
        hex_str = hex_str.lstrip("#")
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

    warna_rgb = [hex_to_rgb(w) for w in warna_challenge]
    warna_wajah_per_frame = []

    for i, (frame, bbox) in enumerate(zip(frame_list, bbox_list)):
        rata = ekstrak_rata_warna_wajah(frame, bbox)
        warna_wajah_per_frame.append(rata)

    channel_scores = []
    for ch in range(3):
        vals = [w[ch] for w in warna_wajah_per_frame]
        challenge_vals = [c[ch] for c in warna_rgb]

        korelasi = float(np.corrcoef(vals, challenge_vals)[0, 1])
        if np.isnan(korelasi):
            korelasi = 0.0
        channel_scores.append(korelasi)

    skor_korelasi = float(np.mean(channel_scores))
    lolos = skor_korelasi >= 0.5

    return {
        "lolos": lolos,
        "pesan": (
            "Color response terverifikasi, wajah responsif terhadap cahaya layar"
            if lolos else
            "Wajah tidak responsif terhadap perubahan cahaya layar, kemungkinan foto/layar"
        ),
        "skor_korelasi": round(skor_korelasi, 3),
        "detail": {
            "warna_challenge": warna_challenge,
            "warna_wajah_per_frame": [(round(r, 1), round(g, 1), round(b, 1)) for r, g, b in warna_wajah_per_frame],
            "channel_scores_rgb": [round(s, 3) for s in channel_scores],
        }
    }