import cv2
import numpy as np
from ultralytics import YOLO
import os

_model = None

def load_model():
    global _model

    if _model is not None:
        return _model

    print("Memuat model YOLO face detection...")
    _model = YOLO("backend/models/yolo11n.pt")
    print("Model berhasil dimuat!")

    return _model


def deteksi_wajah(gambar: np.ndarray, confidence_min: float = 0.5):
    model = load_model()

    hasil = model(gambar, verbose=False)

    wajah_list = []

    for result in hasil:
        for box in result.boxes:
            confidence = float(box.conf[0])

            if confidence < confidence_min:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            wajah_list.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": round(confidence, 4)
            })

    return wajah_list


def crop_wajah(gambar: np.ndarray, bbox: list, padding: int = 20):
    x1, y1, x2, y2 = bbox

    tinggi, lebar = gambar.shape[:2]

    x1 = int(np.clip(x1 - padding, 0, lebar))
    y1 = int(np.clip(y1 - padding, 0, tinggi))
    x2 = int(np.clip(x2 + padding, 0, lebar))
    y2 = int(np.clip(y2 + padding, 0, tinggi))

    wajah_crop = gambar[y1:y2, x1:x2]

    return wajah_crop


def proses_gambar_bytes(image_bytes: bytes, confidence_min: float = 0.5):
    np_array = np.frombuffer(image_bytes, np.uint8)
    gambar = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if gambar is None:
        return {
            "berhasil": False,
            "pesan": "Gagal membaca gambar",
            "wajah": []
        }

    wajah_list = deteksi_wajah(gambar, confidence_min)

    if len(wajah_list) == 0:
        return {
            "berhasil": False,
            "pesan": "Tidak ada wajah terdeteksi",
            "wajah": []
        }

    hasil_crop = []

    for i, wajah in enumerate(wajah_list):
        crop = crop_wajah(gambar, wajah["bbox"])

        _, buffer = cv2.imencode(".jpg", crop)
        crop_bytes = buffer.tobytes()

        hasil_crop.append({
            "index": i,
            "bbox": wajah["bbox"],
            "confidence": wajah["confidence"],
            "crop_bytes": crop_bytes,
            "ukuran_crop": f"{crop.shape[1]}x{crop.shape[0]} piksel"
        })

    return {
        "berhasil": True,
        "pesan": f"{len(hasil_crop)} wajah terdeteksi",
        "total_wajah": len(hasil_crop),
        "wajah": hasil_crop
    }