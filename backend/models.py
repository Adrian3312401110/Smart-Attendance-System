from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


class Dosen(Base):
    __tablename__ = "dosen"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_dosen = Column(String(20), unique=True, nullable=False)
    nama_dosen = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
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
    id_mata_kuliah = Column(String(20), ForeignKey("mata_kuliah.id_mata_kuliah"), nullable=False)
    hari = Column(String(20), nullable=False)
    jam = Column(String(10), nullable=False)
    tanggal = Column(DateTime(timezone=True), nullable=True)
    dibuat_pada = Column(DateTime(timezone=True), server_default=func.now())

    dosen = relationship("Dosen", back_populates="jadwal")
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
    foto_absensi = Column(String(255), nullable=True)
    lokasi = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    lokasi_valid = Column(Boolean, default=False)
    confidence = Column(Float, nullable=True)
    status = Column(String(20), default="hadir")

    mahasiswa = relationship("Mahasiswa", back_populates="absensi")
    jadwal = relationship("Jadwal", back_populates="absensi")
    mata_kuliah = relationship("MataKuliah", back_populates="absensi")

    def __repr__(self):
        return f"<Absensi mhs={self.id_mahasiswa} mk={self.id_mata_kuliah} status={self.status}>"