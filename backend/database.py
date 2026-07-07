from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = os.getenv("DATABASE_URL") or (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    if all([DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME])
    else "sqlite:///./smart_attendance.db"
)

engine = create_engine(
    DATABASE_URL,
    # Neon (dan Postgres serverless lain) auto-suspend compute saat idle —
    # koneksi lama di pool bisa jadi basi lalu error "SSL connection has
    # been closed unexpectedly". pool_pre_ping mengetes tiap koneksi sebelum
    # dipakai, pool_recycle mendaur ulang sebelum sempat basi.
    # (sslmode/channel_binding tidak perlu ditambahkan lagi di sini karena
    # sudah ada di query string DATABASE_URL bawaan Neon.)
    pool_pre_ping=True,
    pool_recycle=280,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()