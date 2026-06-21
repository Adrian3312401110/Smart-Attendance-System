import cv2
import numpy as np


def hitung_variasi_antar_frame(frame_list: list[np.ndarray]) -> dict:
    if len(frame_list) < 2:
        return {
            "rata_rata_diff": 0.0,
            "std_diff": 0.0,
            "diff_per_frame": []
        }

    ukuran_seragam = (150, 150)
    frames_gray = []
    for f in frame_list:
        gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, ukuran_seragam)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        frames_gray.append(gray.astype(np.float32))

    diff_per_frame = []
    for i in range(len(frames_gray) - 1):
        diff = cv2.absdiff(frames_gray[i], frames_gray[i + 1])
        skor_diff = float(diff.mean())
        diff_per_frame.append(round(skor_diff, 4))

    rata_rata_diff = float(np.mean(diff_per_frame))
    std_diff = float(np.std(diff_per_frame))

    return {
        "rata_rata_diff": round(rata_rata_diff, 4),
        "std_diff": round(std_diff, 4),
        "diff_per_frame": diff_per_frame
    }


def cek_liveness_temporal(
    frame_list: list[np.ndarray],
    ambang_minimal: float = 0.3,
    ambang_maksimal: float = 1.72
) -> dict:
    """
    Liveness check berbasis variasi temporal antar frame.

    Berdasarkan kalibrasi empiris:
    - Wajah asli (ditopang leher, relatif stabil): variasi ~1.42-1.72
    - Foto dipegang tangan (micro-tremor tangan manusia): variasi ~1.72-2.68
    - Foto ditempel/disangga diam total (tidak diuji): kemungkinan < 0.3

    ambang_minimal: di bawah ini = kemungkinan foto yang disangga sangat diam
                    (tidak ada variasi sama sekali, termasuk noise sensor wajar)
    ambang_maksimal: di atas ini = kemungkinan dipegang tangan (micro-tremor
                      lebih besar dari gerakan wajah natural)
    """
    if len(frame_list) < 2:
        return {
            "lolos": False,
            "pesan": "Jumlah frame tidak cukup untuk pengecekan liveness",
            "skor_variasi": 0.0,
            "detail": {}
        }

    hasil = hitung_variasi_antar_frame(frame_list)
    variasi = hasil["rata_rata_diff"]

    lolos = ambang_minimal <= variasi <= ambang_maksimal

    if variasi < ambang_minimal:
        pesan = "Tidak terdeteksi variasi gerakan wajar, kemungkinan gambar statis"
    elif variasi > ambang_maksimal:
        pesan = "Terdeteksi variasi gerakan tidak wajar, kemungkinan perangkat dipegang tangan"
    else:
        pesan = "Wajah terverifikasi menunjukkan gerakan alami (liveness terkonfirmasi)"

    return {
        "lolos": lolos,
        "pesan": pesan,
        "skor_variasi": variasi,
        "detail": {
            "rata_rata_diff": hasil["rata_rata_diff"],
            "std_diff": hasil["std_diff"],
            "diff_per_frame": hasil["diff_per_frame"],
        }
    }