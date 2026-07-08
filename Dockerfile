FROM python:3.10-slim

# Install dependensi sistem untuk OpenCV, GL, dan PostgreSQL
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# --- BARIS BARU: Beri tahu Python bahwa /code adalah pusat folder ---
ENV PYTHONPATH=/code

# Salin dan instal requirements
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Salin seluruh kode backend Anda ke kontainer
COPY ./backend /code/backend

# Jalankan server FastAPI menggunakan Uvicorn di port wajib Hugging Face
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
