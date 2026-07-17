import numpy as np
import json
import cv2
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from backend import models
from backend.face_detection import deteksi_wajah, crop_wajah

_arcface_model = None


def load_arcface():
    global _arcface_model

    if _arcface_model is not None:
        return _arcface_model

    print("Memuat model ArcFace...")
    _arcface_model = FaceAnalysis(
        name="buffalo_sc",
        providers=["CPUExecutionProvider"]
    )
    _arcface_model.prepare(ctx_id=0, det_size=(640, 640))
    print("Model ArcFace berhasil dimuat!")

    return _arcface_model


def generate_embedding(image_bytes: bytes, bbox_terdeteksi: list | None = None):
    """
    Generate embedding wajah dari bytes gambar.

    Parameter opsional `bbox_terdeteksi`:
    - Kalau bbox wajah SUDAH diketahui sebelumnya (misal dari pemanggilan
      deteksi_wajah() yang dilakukan endpoint pemanggil), kirim di sini supaya
      fungsi ini TIDAK menjalankan YOLO lagi untuk gambar yang sama.
    - Kalau None (default), perilaku sama seperti sebelumnya: YOLO dijalankan
      di sini untuk mencari bbox wajah.
    """
    model = load_arcface()

    np_array = np.frombuffer(image_bytes, np.uint8)
    gambar = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if gambar is None:
        return None, "Gagal membaca gambar"

    if bbox_terdeteksi is not None:
        bbox = bbox_terdeteksi
    else:
        wajah_list = deteksi_wajah(gambar, confidence_min=0.3)
        if len(wajah_list) == 0:
            return None, "YOLO tidak mendeteksi wajah"
        bbox = wajah_list[0]["bbox"]

    wajah_crop = crop_wajah(gambar, bbox, padding=20)

    if wajah_crop.size == 0:
        return None, "Gagal crop wajah"

    wajah_resized = cv2.resize(wajah_crop, (112, 112))

    hasil_arcface = model.get(wajah_resized)

    if len(hasil_arcface) == 0:
        wajah_besar = cv2.resize(wajah_crop, (224, 224))
        hasil_arcface = model.get(wajah_besar)

    if len(hasil_arcface) == 0:
        hasil_arcface = model.get(gambar)

    if len(hasil_arcface) == 0:
        return None, "ArcFace gagal generate embedding"

    embedding = hasil_arcface[0].embedding
    embedding = embedding / np.linalg.norm(embedding)

    return embedding, None


def simpan_embedding(id_mahasiswa: str, id_foto: str, path_foto: str, image_bytes: bytes, db: Session,
                      bbox_terdeteksi: list | None = None):
    embedding, error = generate_embedding(image_bytes, bbox_terdeteksi=bbox_terdeteksi)

    if embedding is None:
        return {
            "berhasil": False,
            "pesan": f"Gagal generate embedding: {error}"
        }

    embedding_json = json.dumps(embedding.tolist())

    ada = db.query(models.FotoWajah).filter(
        models.FotoWajah.id_foto == id_foto
    ).first()

    if ada:
        ada.face_embedding = embedding_json
        db.commit()
        db.refresh(ada)
        return {
            "berhasil": True,
            "pesan": "Embedding wajah berhasil diperbarui",
            "id_foto": ada.id_foto,
            "dimensi_embedding": len(embedding)
        }

    foto_baru = models.FotoWajah(
        id_mahasiswa=id_mahasiswa,
        id_foto=id_foto,
        path_foto=path_foto,
        face_embedding=embedding_json
    )

    db.add(foto_baru)
    db.commit()
    db.refresh(foto_baru)

    return {
        "berhasil": True,
        "pesan": "Embedding wajah berhasil disimpan",
        "id_foto": foto_baru.id_foto,
        "dimensi_embedding": len(embedding)
    }


def kenali_wajah(image_bytes: bytes, db: Session, expected_id: str | None = None, threshold: float = 0.5,
                  bbox_terdeteksi: list | None = None):
    """
    `bbox_terdeteksi`: sama seperti di generate_embedding() -- kirim kalau bbox
    wajah sudah diketahui dari deteksi sebelumnya, supaya YOLO tidak dipanggil ulang.
    """
    embedding_input, error = generate_embedding(image_bytes, bbox_terdeteksi=bbox_terdeteksi)

    if embedding_input is None:
        return {
            "berhasil": False,
            "pesan": f"Gagal proses wajah: {error}",
            "identitas": None,
            "confidence": 0.0
        }

    query = db.query(models.FotoWajah).filter(models.FotoWajah.face_embedding != None)
    if expected_id:
        query = query.filter(models.FotoWajah.id_mahasiswa == expected_id)

    semua_foto = query.all()

    if len(semua_foto) == 0:
        return {
            "berhasil": False,
            "pesan": f"Belum ada data wajah terdaftar untuk akun ini" if expected_id else "Database embedding masih kosong",
            "identitas": None,
            "confidence": 0.0
        }

    similarity_terbaik = -1
    mahasiswa_terbaik = None

    for foto in semua_foto:
        embedding_db = np.array(json.loads(foto.face_embedding))
        embedding_db = embedding_db / np.linalg.norm(embedding_db)

        similarity = cosine_similarity(
            embedding_input.reshape(1, -1),
            embedding_db.reshape(1, -1)
        )[0][0]

        if similarity > similarity_terbaik:
            similarity_terbaik = similarity
            mahasiswa_terbaik = foto.id_mahasiswa

    if similarity_terbaik >= threshold:
        mahasiswa = db.query(models.Mahasiswa).filter(
            models.Mahasiswa.id_mahasiswa == mahasiswa_terbaik
        ).first()

        return {
            "berhasil": True,
            "pesan": "Identitas berhasil dikenali",
            "identitas": mahasiswa_terbaik,
            "nama": mahasiswa.nama_mahasiswa if mahasiswa else "Tidak ditemukan",
            "confidence": round(float(similarity_terbaik), 4),
            "status": "DIKENAL"
        }
    else:
        return {
            "berhasil": False,
            "pesan": "Wajah tidak dikenal",
            "identitas": None,
            "confidence": round(float(similarity_terbaik), 4),
            "status": "TIDAK DIKENAL"
        }