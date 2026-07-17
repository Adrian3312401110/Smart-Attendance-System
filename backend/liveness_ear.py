import numpy as np
from insightface.app import FaceAnalysis
import cv2

def debug_visualisasi_landmark(frame: np.ndarray, simpan_ke: str = "debug_landmark.jpg"):
    model = load_landmark_model()
    hasil = model.get(frame)
    if len(hasil) == 0:
        print("Tidak ada wajah")
        return
    
    wajah = hasil[0]
    lm = wajah.get("landmark_2d_106")
    if lm is None:
        print("Tidak ada landmark_2d_106")
        return
    
    img = frame.copy()
    for i, (x, y) in enumerate(lm):
        cv2.circle(img, (int(x), int(y)), 2, (0, 255, 0), -1)
        # Tampilkan nomor hanya di sekitar area mata (indeks 30-45 dan 85-100)
        if (30 <= i <= 45) or (85 <= i <= 100):
            cv2.putText(img, str(i), (int(x)+2, int(y)-2), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 255), 1)
    
    cv2.imwrite(simpan_ke, img)
    print(f"Landmark divisualisasikan ke {simpan_ke}")


_model = None


def load_landmark_model():
    global _model
    if _model is not None:
        return _model
    print("Memuat model InsightFace buffalo_l untuk landmark detection...")
    _model = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"]
    )
    _model.prepare(ctx_id=0, det_size=(640, 640))
    print("Model buffalo_l berhasil dimuat!")
    return _model


def hitung_ear_dari_6_titik(p: list) -> float:
    """
    Hitung Eye Aspect Ratio dari 6 titik:
    p[0], p[3] = sudut kiri dan kanan (horizontal)
    p[1], p[2] = titik atas kelopak
    p[4], p[5] = titik bawah kelopak

    EAR = (||p1-p5|| + ||p2-p4||) / (2 * ||p0-p3||)
    """
    p = [np.array(pt) for pt in p]
    v1 = np.linalg.norm(p[1] - p[5])
    v2 = np.linalg.norm(p[2] - p[4])
    h  = np.linalg.norm(p[0] - p[3])
    if h == 0:
        return 0.0
    return float((v1 + v2) / (2.0 * h))


def ekstrak_ear_dari_106(landmark: np.ndarray) -> tuple[float, float]:
    """
    Ekstrak EAR mata kiri dan kanan dari 106-point landmark InsightFace.

    Peta 106-point InsightFace (indeks mulai 0):
    Mata kiri  (dari perspektif orang): 33, 34, 35, 36, 37, 38
    Mata kanan (dari perspektif orang): 87, 88, 89, 90, 91, 92

    Layout per mata (6 titik):
    [sudut dalam, atas-dalam, atas-luar, sudut luar, bawah-luar, bawah-dalam]
    """
    idx_kiri  = [33, 34, 35, 36, 37, 38]
    idx_kanan = [87, 88, 89, 90, 91, 92]

    pts_kiri  = [landmark[i] for i in idx_kiri]
    pts_kanan = [landmark[i] for i in idx_kanan]

    ear_kiri  = hitung_ear_dari_6_titik(pts_kiri)
    ear_kanan = hitung_ear_dari_6_titik(pts_kanan)

    return ear_kiri, ear_kanan


def ekstrak_ear_dari_68(landmark: np.ndarray) -> tuple[float, float]:
    """
    Ekstrak EAR dari 68-point landmark (dlib standard).
    Mata kiri : indeks 36-41
    Mata kanan: indeks 42-47
    """
    idx_kiri  = [36, 37, 38, 39, 40, 41]
    idx_kanan = [42, 43, 44, 45, 46, 47]

    pts_kiri  = [landmark[i] for i in idx_kiri]
    pts_kanan = [landmark[i] for i in idx_kanan]

    ear_kiri  = hitung_ear_dari_6_titik(pts_kiri)
    ear_kanan = hitung_ear_dari_6_titik(pts_kanan)

    return ear_kiri, ear_kanan


def ekstrak_ear_per_frame(frame_list: list[np.ndarray]) -> dict:
    model = load_landmark_model()

    ear_kiri_list  = []
    ear_kanan_list = []
    ear_rata_list  = []

    for frame in frame_list:
        hasil = model.get(frame)

        if len(hasil) == 0:
            ear_kiri_list.append(None)
            ear_kanan_list.append(None)
            ear_rata_list.append(None)
            continue

        wajah = hasil[0]

        # Coba 106-point dulu (buffalo_l)
        lm_106 = getattr(wajah, "landmark_2d_106", None)
        lm_68  = getattr(wajah, "landmark_3d_68", None)

        if lm_106 is not None and len(lm_106) >= 93:
            ear_l, ear_r = ekstrak_ear_dari_106(lm_106)
        elif lm_68 is not None and len(lm_68) >= 48:
            ear_l, ear_r = ekstrak_ear_dari_68(lm_68)
        else:
            # Fallback: coba langsung akses key dari dict-like object
            try:
                lm = wajah.get("landmark_2d_106")
                if lm is not None and len(lm) >= 93:
                    ear_l, ear_r = ekstrak_ear_dari_106(lm)
                else:
                    ear_kiri_list.append(None)
                    ear_kanan_list.append(None)
                    ear_rata_list.append(None)
                    continue
            except Exception:
                ear_kiri_list.append(None)
                ear_kanan_list.append(None)
                ear_rata_list.append(None)
                continue

        ear_rata = (ear_l + ear_r) / 2.0
        ear_kiri_list.append(round(ear_l, 4))
        ear_kanan_list.append(round(ear_r, 4))
        ear_rata_list.append(round(ear_rata, 4))

    return {
        "ear_kiri":  ear_kiri_list,
        "ear_kanan": ear_kanan_list,
        "ear_rata":  ear_rata_list,
    }


def cek_liveness_ear(
    frame_list: list[np.ndarray],
    ambang_ear_tutup: float = 0.20,
    jumlah_frame_tutup_minimal: int = 1,
) -> dict:
    """
    Liveness check berbasis EAR blink detection.

    Wajah asli akan kedip natural dalam ~2 detik.
    Foto statis EAR-nya konstan — tidak pernah turun di bawah ambang.

    ambang_ear_tutup        : EAR di bawah ini = mata menutup (kedip).
                              Normal terbuka: 0.25-0.35. Saat kedip: 0.10-0.18.
    jumlah_frame_tutup_minimal: minimal frame dengan mata tertutup untuk lolos.
    """
    if len(frame_list) < 5:
        return {
            "lolos": False,
            "pesan": "Jumlah frame tidak cukup untuk deteksi kedipan",
            "detail": {}
        }

    hasil_ear    = ekstrak_ear_per_frame(frame_list)
    ear_rata_list = hasil_ear["ear_rata"]

    valid_ear = [e for e in ear_rata_list if e is not None]

    if len(valid_ear) < 3:
        return {
            "lolos": False,
            "pesan": "Tidak cukup frame wajah terdeteksi — pastikan pencahayaan cukup dan wajah menghadap kamera",
            "detail": {
                "ear_rata_per_frame": ear_rata_list,
                "frame_valid": len(valid_ear),
            }
        }

    frame_tutup   = [e for e in valid_ear if e < ambang_ear_tutup]
    jumlah_kedip  = len(frame_tutup)
    ear_min       = min(valid_ear)
    ear_max       = max(valid_ear)
    ear_variasi   = ear_max - ear_min

    lolos = jumlah_kedip >= jumlah_frame_tutup_minimal

    if lolos:
        pesan = f"Kedipan mata terdeteksi ({jumlah_kedip} frame) — liveness terkonfirmasi"
    else:
        pesan = "Tidak terdeteksi kedipan mata natural — kemungkinan gambar statis atau pencahayaan kurang"

    return {
        "lolos": lolos,
        "pesan": pesan,
        "detail": {
            "ear_rata_per_frame":    ear_rata_list,
            "ear_min":               round(ear_min, 4),
            "ear_max":               round(ear_max, 4),
            "ear_variasi":           round(ear_variasi, 4),
            "jumlah_frame_tutup":    jumlah_kedip,
            "ambang_tutup":          ambang_ear_tutup,
            "frame_valid":           len(valid_ear),
        }
    }