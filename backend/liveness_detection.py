import cv2
import numpy as np


def hitung_skor_moire(wajah_crop: np.ndarray) -> dict:
    gray = cv2.cvtColor(wajah_crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (256, 256))

    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.log(np.abs(fshift) + 1)

    h, w = magnitude.shape
    cy, cx = h // 2, w // 2

    radius_rendah = 20
    mask_rendah = np.zeros((h, w), dtype=bool)
    y_grid, x_grid = np.ogrid[:h, :w]
    jarak = np.sqrt((y_grid - cy) ** 2 + (x_grid - cx) ** 2)
    mask_rendah[jarak <= radius_rendah] = True

    energi_rendah = magnitude[mask_rendah].mean()
    energi_tinggi = magnitude[~mask_rendah].mean()

    if energi_rendah == 0:
        rasio = 0.0
    else:
        rasio = energi_tinggi / energi_rendah

    skor = float(np.clip((rasio - 0.3) * 150, 0, 100))

    return {
        "skor": skor,
        "raw_energi_rendah": float(energi_rendah),
        "raw_energi_tinggi": float(energi_tinggi),
        "raw_rasio": float(rasio),
    }


def hitung_skor_frame_edge(wajah_crop: np.ndarray) -> dict:
    gray = cv2.cvtColor(wajah_crop, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)

    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180, threshold=80,
        minLineLength=int(wajah_crop.shape[1] * 0.4),
        maxLineGap=10
    )

    jumlah_garis = 0 if lines is None else len(lines)
    skor = float(np.clip(jumlah_garis * 8, 0, 100))

    return {
        "skor": skor,
        "raw_jumlah_garis": jumlah_garis,
    }


def hitung_skor_sharpness_anomali(wajah_crop: np.ndarray) -> dict:
    gray = cv2.cvtColor(wajah_crop, cv2.COLOR_BGR2GRAY)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    if laplacian_var >= 150:
        skor = 0.0
    elif laplacian_var <= 20:
        skor = 100.0
    else:
        skor = float(np.clip((150 - laplacian_var) / (150 - 20) * 100, 0, 100))

    return {
        "skor": skor,
        "raw_laplacian_var": laplacian_var,
    }


def cek_liveness(wajah_crop: np.ndarray, threshold: float = 55.0) -> dict:
    if wajah_crop is None or wajah_crop.size == 0:
        return {
            "lolos": False,
            "pesan": "Gambar wajah tidak valid untuk pengecekan liveness",
            "skor_akhir": 100.0,
            "detail": {},
            "raw": {}
        }

    moire = hitung_skor_moire(wajah_crop)
    frame_edge = hitung_skor_frame_edge(wajah_crop)
    sharpness = hitung_skor_sharpness_anomali(wajah_crop)

    skor_akhir = (moire["skor"] * 0.5) + (frame_edge["skor"] * 0.3) + (sharpness["skor"] * 0.2)
    lolos = skor_akhir < threshold

    return {
        "lolos": lolos,
        "pesan": (
            "Wajah terverifikasi sebagai pengambilan langsung"
            if lolos else
            "Terdeteksi indikasi pengambilan gambar dari layar/perangkat lain"
        ),
        "skor_akhir": round(skor_akhir, 2),
        "detail": {
            "skor_moire": round(moire["skor"], 2),
            "skor_frame_edge": round(frame_edge["skor"], 2),
            "skor_sharpness_anomali": round(sharpness["skor"], 2),
        },
        "raw": {
            "moire_energi_rendah": round(moire["raw_energi_rendah"], 4),
            "moire_energi_tinggi": round(moire["raw_energi_tinggi"], 4),
            "moire_rasio": round(moire["raw_rasio"], 4),
            "frame_jumlah_garis": frame_edge["raw_jumlah_garis"],
            "sharpness_laplacian_var": round(sharpness["raw_laplacian_var"], 2),
        }
    }