import cv2
import numpy as np
import mediapipe as mp
import secrets
import mediapipe.python.solutions.face_mesh as face_mesh
import mediapipe.python.solutions.drawing_utils as drawing_utils
import mediapipe.python.solutions.hands as mp_hands

mp_face_mesh = face_mesh

_face_mesh = None

POOL_GESTURE = ["senyum", "kedip_2x", "hadap_kanan", "hadap_kiri", "geleng", "ngangguk"]

INSTRUKSI_GESTURE = {
    "senyum":      "😊 Tersenyumlah",
    "kedip_2x":    "👁️ Kedipkan mata dua kali secara perlahan",
    "hadap_kanan": "➡️ Hadapkan wajah ke kanan",
    "hadap_kiri":  "⬅️ Hadapkan wajah ke kiri",
    "geleng":      "↔️ Gelengkan kepala",
    "ngangguk":    "↕️ Anggukkan kepala",
}


def load_gesture_model():
    global _face_mesh
    if _face_mesh is not None:
        return _face_mesh
    print("Memuat MediaPipe Face Mesh untuk gesture detection...")
    _face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    print("MediaPipe Face Mesh berhasil dimuat!")
    return _face_mesh


def generate_gesture_challenge(jumlah: int = 3) -> list:
    return secrets.SystemRandom().sample(POOL_GESTURE, min(jumlah, len(POOL_GESTURE)))

# Tempel di backend/gesture_detection.py, setelah definisi POOL_GESTURE / INSTRUKSI_GESTURE / generate_gesture_challenge.
# Pool ini KHUSUS untuk halaman registrasi — pool & endpoint absensi (mahasiswa/ambil-absensi) tidak diubah.

POOL_GESTURE_REGISTRASI = ["senyum", "hadap_kanan", "hadap_kiri"]


def generate_gesture_challenge_registrasi(jumlah: int = 3) -> list:
    return secrets.SystemRandom().sample(POOL_GESTURE_REGISTRASI, min(jumlah, len(POOL_GESTURE_REGISTRASI)))

def ekstrak_fitur_dari_frame(frame: np.ndarray) -> dict | None:
    """
    Ekstrak fitur wajah dari satu frame menggunakan MediaPipe Face Mesh.
    Mengembalikan dict berisi EAR, skor senyum, yaw, pitch, atau None jika tidak ada wajah.
    """
    model = load_gesture_model()

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    hasil = model.process(rgb)

    if not hasil.multi_face_landmarks:
        return None

    lm = hasil.multi_face_landmarks[0].landmark

    def pt(idx):
        return np.array([lm[idx].x * w, lm[idx].y * h])

    def pt3(idx):
        return np.array([lm[idx].x, lm[idx].y, lm[idx].z])

    # ===== EAR (Eye Aspect Ratio) =====
    def ear(idx_list):
        p = [pt(i) for i in idx_list]
        v1 = np.linalg.norm(p[1] - p[5])
        v2 = np.linalg.norm(p[2] - p[4])
        h_ = np.linalg.norm(p[0] - p[3])
        return float((v1 + v2) / (2.0 * h_)) if h_ > 0 else 0.0

    ear_kiri  = ear([362, 385, 387, 263, 373, 380])
    ear_kanan = ear([33,  160, 158, 133, 153, 144])
    ear_rata  = (ear_kiri + ear_kanan) / 2.0

    # ===== Skor Senyum =====
    sudut_kiri  = pt(61)
    sudut_kanan = pt(291)
    atas_bibir  = pt(13)
    bawah_bibir = pt(14)
    lebar_mulut = np.linalg.norm(sudut_kanan - sudut_kiri)
    tinggi_mulut = np.linalg.norm(bawah_bibir - atas_bibir)
    skor_senyum = float(lebar_mulut / tinggi_mulut) if tinggi_mulut > 0 else 0.0

    # ===== Yaw dan Pitch dari landmark 3D =====
    hidung   = pt3(1)
    dagu     = pt3(199)
    mata_kiri_luar  = pt3(33)
    mata_kanan_luar = pt3(263)
    telinga_kiri    = pt3(234)
    telinga_kanan   = pt3(454)

    jarak_kiri  = np.linalg.norm(hidung[:2] - telinga_kiri[:2])
    jarak_kanan = np.linalg.norm(hidung[:2] - telinga_kanan[:2])
    total_jarak = jarak_kiri + jarak_kanan
    if total_jarak > 0:
        yaw = float((jarak_kanan - jarak_kiri) / total_jarak * 90)
    else:
        yaw = 0.0

    tengah_mata_y = (mata_kiri_luar[1] + mata_kanan_luar[1]) / 2.0
    total_tinggi = abs(float(dagu[1]) - float(tengah_mata_y))
    if total_tinggi > 0:
        posisi_hidung = (float(hidung[1]) - float(tengah_mata_y)) / total_tinggi
        pitch = float((posisi_hidung - 0.5) * 60)
    else:
        pitch = 0.0

    return {
        "ear_rata":    round(ear_rata, 4),
        "ear_kiri":    round(ear_kiri, 4),
        "ear_kanan":   round(ear_kanan, 4),
        "skor_senyum": round(skor_senyum, 4),
        "yaw":         round(yaw, 2),
        "pitch":       round(pitch, 2),
    }


# ===================== DETEKSI PER GESTURE =====================

def deteksi_senyum(fitur_list: list[dict], ambang: float = 2.8) -> dict:
    skor_list = [f["skor_senyum"] for f in fitur_list]
    maks = max(skor_list)
    lolos = maks >= ambang
    return {
        "lolos": lolos,
        "alasan": f"Skor senyum maks: {round(maks, 3)} (ambang: {ambang})",
        "nilai": round(maks, 3)
    }


def deteksi_kedip_2x(fitur_list: list[dict], ambang_tutup: float = 0.20) -> dict:
    ear_list = [f["ear_rata"] for f in fitur_list]
    kedip_count = 0
    sedang_tutup = False
    for ear in ear_list:
        if ear < ambang_tutup:
            if not sedang_tutup:
                kedip_count += 1
                sedang_tutup = True
        else:
            sedang_tutup = False

    lolos = kedip_count >= 2
    return {
        "lolos": lolos,
        "alasan": f"Terdeteksi {kedip_count} kedipan (butuh minimal 2)",
        "nilai": kedip_count
    }


def deteksi_hadap_kanan(fitur_list: list[dict], ambang_yaw: float = 12.0) -> dict:
    yaw_list = [f["yaw"] for f in fitur_list]
    min_yaw = min(yaw_list)
    lolos = min_yaw <= -ambang_yaw
    return {
        "lolos": lolos,
        "alasan": f"Yaw min: {round(min_yaw, 1)}° (ambang: -{ambang_yaw}°)",
        "nilai": round(min_yaw, 1)
    }


def deteksi_hadap_kiri(fitur_list: list[dict], ambang_yaw: float = 12.0) -> dict:
    yaw_list = [f["yaw"] for f in fitur_list]
    maks_yaw = max(yaw_list)
    lolos = maks_yaw >= ambang_yaw
    return {
        "lolos": lolos,
        "alasan": f"Yaw maks: {round(maks_yaw, 1)}° (ambang: {ambang_yaw}°)",
        "nilai": round(maks_yaw, 1)
    }

def deteksi_geleng(fitur_list: list[dict], ambang_range: float = 18.0) -> dict:
    yaw_list = [f["yaw"] for f in fitur_list]
    range_yaw = max(yaw_list) - min(yaw_list)
    lolos = range_yaw >= ambang_range
    return {
        "lolos": lolos,
        "alasan": f"Range yaw: {round(range_yaw, 1)}° (ambang: {ambang_range}°)",
        "nilai": round(range_yaw, 1)
    }
 
 
def deteksi_ngangguk(fitur_list: list[dict], ambang_range: float = 10.0) -> dict:
    pitch_list = [f["pitch"] for f in fitur_list]
    range_pitch = max(pitch_list) - min(pitch_list)
    lolos = range_pitch >= ambang_range
    return {
        "lolos": lolos,
        "alasan": f"Range pitch: {round(range_pitch, 1)}° (ambang: {ambang_range}°)",
        "nilai": round(range_pitch, 1)
    }

DETECTOR_MAP = {
    "senyum":      deteksi_senyum,
    "kedip_2x":    deteksi_kedip_2x,
    "hadap_kanan": deteksi_hadap_kanan,
    "hadap_kiri":  deteksi_hadap_kiri,
    "geleng":      deteksi_geleng,
    "ngangguk":    deteksi_ngangguk,
}


def proses_gesture_challenge(
    frame_list: list[np.ndarray],
    gesture_yang_diminta: str
) -> dict:
    # Menaikkan batas sampling dari 6 menjadi 12 frame agar lebih rapat menangkap kedipan
    if len(frame_list) > 12:
        step = max(1, len(frame_list) // 12)
        frame_list = frame_list[::step][:12]

    fitur_list = []
    for frame in frame_list:
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640 / w
            frame = cv2.resize(frame, (640, int(h * scale)))

        fitur = ekstrak_fitur_dari_frame(frame)
        if fitur:
            fitur_list.append(fitur)

    print(f"[GESTURE] {gesture_yang_diminta} | frame valid: {len(fitur_list)}/{len(frame_list)}")
    if fitur_list:
        print(f"[GESTURE] Fitur sample: {fitur_list}")

    if len(fitur_list) < 2:
        return {
            "lolos": False,
            "gesture": gesture_yang_diminta,
            "alasan": "Wajah tidak terdeteksi cukup di frame",
            "detail": {"frame_valid": len(fitur_list)}
        }

    detector = DETECTOR_MAP.get(gesture_yang_diminta)
    if detector is None:
        return {
            "lolos": False,
            "gesture": gesture_yang_diminta,
            "alasan": f"Gesture '{gesture_yang_diminta}' tidak dikenal",
            "detail": {}
        }

    hasil = detector(fitur_list)

    return {
        "lolos":   hasil["lolos"],
        "gesture": gesture_yang_diminta,
        "alasan":  hasil["alasan"],
        "detail": {
            "nilai":       hasil.get("nilai"),
            "frame_valid": len(fitur_list),
            "frame_total": len(frame_list),
        }
    }
