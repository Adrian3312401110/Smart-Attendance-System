import os
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserAccount(Base):
    __tablename__ = "user_account"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    user_id = Column(String(50), nullable=False)
    nama = Column(String(100), nullable=False)
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<UserAccount email={self.email} role={self.role}>"


class Dosen(Base):
    __tablename__ = "dosen"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_dosen = Column(String(20), unique=True, nullable=False)
    nama_dosen = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    foto_profil = Column(String(255), nullable=True)   # <-- BARU: path relatif file foto, mis. "uploads/profil/dosen_D001.jpg"
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    jadwal = relationship("Jadwal", back_populates="dosen")

    def __repr__(self):
        return f"<Dosen id={self.id_dosen} nama={self.nama_dosen}>"


class MataKuliah(Base):
    __tablename__ = "mata_kuliah"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_mata_kuliah = Column(String(20), unique=True, nullable=False)
    nama = Column(String(100), nullable=False)
    sks = Column(Integer, nullable=True)
    aktif = Column(Boolean, default=True)
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    jadwal = relationship("Jadwal", back_populates="mata_kuliah")
    absensi = relationship("Absensi", back_populates="mata_kuliah")

    def __repr__(self):
        return f"<MataKuliah id={self.id_mata_kuliah} nama={self.nama}>"


class Jadwal(Base):
    __tablename__ = "jadwal"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_dosen = Column(String(20), ForeignKey("dosen.id_dosen"), nullable=False)
    id_kelas = Column(Integer, ForeignKey("kelas.id"), nullable=True)
    id_mata_kuliah = Column(String(20), ForeignKey("mata_kuliah.id_mata_kuliah"), nullable=False)
    hari = Column(String(20), nullable=False)
    jam = Column(String(20), nullable=True)
    jam_mulai = Column(String(10), nullable=True)
    jam_selesai = Column(String(10), nullable=True)
    tanggal = Column(DateTime(timezone=True), nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_meter = Column(Integer, nullable=True, default=200)
    gps_aktif = Column(Boolean, default=True)

    jumlah_gesture = Column(Integer, default=3)
    mode_absensi = Column(String(20), default="tetap")
    daftar_jam_absensi = Column(Text, nullable=True)
    jumlah_sesi_acak = Column(Integer, default=1)
    toleransi_telat_menit = Column(Integer, default=30)

    aktif = Column(Boolean, default=True)
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    dosen = relationship("Dosen", back_populates="jadwal")
    kelas = relationship("Kelas")
    mata_kuliah = relationship("MataKuliah", back_populates="jadwal")
    absensi = relationship("Absensi", back_populates="jadwal")

    def __repr__(self):
        return f"<Jadwal mk={self.id_mata_kuliah} hari={self.hari} jam={self.jam}>"


class Mahasiswa(Base):
    __tablename__ = "mahasiswa"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_mahasiswa = Column(String(20), unique=True, nullable=False)
    nama_mahasiswa = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    angkatan = Column(String(10), nullable=True)
    mata_kuliah = Column(String(200), nullable=True)
    foto_profil = Column(String(255), nullable=True)   # <-- BARU: path relatif file foto, mis. "uploads/profil/mhs_M001.jpg"
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    foto_wajah = relationship("FotoWajah", back_populates="mahasiswa")
    absensi = relationship("Absensi", back_populates="mahasiswa")

    def __repr__(self):
        return f"<Mahasiswa id={self.id_mahasiswa} nama={self.nama_mahasiswa}>"


class FotoWajah(Base):
    __tablename__ = "foto_wajah"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_mahasiswa = Column(String(20), ForeignKey("mahasiswa.id_mahasiswa"), nullable=False)
    id_foto = Column(String(50), unique=True, nullable=False)
    path_foto = Column(String(255), nullable=False)
    face_embedding = Column(Text, nullable=True)
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    mahasiswa = relationship("Mahasiswa", back_populates="foto_wajah")

    def __repr__(self):
        return f"<FotoWajah id={self.id_foto} mahasiswa={self.id_mahasiswa}>"


class Absensi(Base):
    __tablename__ = "absensi"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_mahasiswa = Column(String(20), ForeignKey("mahasiswa.id_mahasiswa"), nullable=False)
    id_jadwal = Column(Integer, ForeignKey("jadwal.id"), nullable=False)
    id_mata_kuliah = Column(String(20), ForeignKey("mata_kuliah.id_mata_kuliah"), nullable=False)
    tanggal_absensi = Column(DateTime(timezone=True), server_default=func.now())
    jam_target = Column(String(5), nullable=True)
    foto_absensi = Column(String(255), nullable=True)
    lokasi = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    lokasi_valid = Column(Boolean, default=False)
    confidence = Column(Float, nullable=True)
    status = Column(String(20), default="hadir")
    telat_detik = Column(Integer, nullable=True, default=0)

    mahasiswa = relationship("Mahasiswa", back_populates="absensi")
    jadwal = relationship("Jadwal", back_populates="absensi")
    mata_kuliah = relationship("MataKuliah", back_populates="absensi")

    def __repr__(self):
        return f"<Absensi mhs={self.id_mahasiswa} mk={self.id_mata_kuliah} status={self.status}>"


import secrets
import string


def generate_kode_kelas():
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(6)) + "#"


class Kelas(Base):
    __tablename__ = "kelas"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nama = Column(String(50), nullable=False)
    pelajaran = Column(String(100), nullable=True)
    lokasi = Column(String(100), nullable=True)
    kode_gabung = Column(String(10), unique=True, nullable=False, default=generate_kode_kelas)
    id_dosen = Column(String(20), ForeignKey("dosen.id_dosen"), nullable=False)
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    dosen = relationship("Dosen")
    anggota = relationship("KelasMahasiswa", back_populates="kelas")

    def __repr__(self):
        return f"<Kelas {self.nama}>"


class KelasMahasiswa(Base):
    __tablename__ = "kelas_mahasiswa"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_kelas = Column(Integer, ForeignKey("kelas.id"), nullable=False)
    id_mahasiswa = Column(String(20), ForeignKey("mahasiswa.id_mahasiswa"), nullable=False)
    status = Column(String(20), default="pending")
    bergabung_pada = Column(DateTime(timezone=True), server_default=func.now())

    kelas = relationship("Kelas", back_populates="anggota")
    mahasiswa = relationship("Mahasiswa")

    def __repr__(self):
        return f"<KelasMahasiswa kelas={self.id_kelas} mhs={self.id_mahasiswa} status={self.status}>"