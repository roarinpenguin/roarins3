FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build


FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    nginx \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    echo "Downloading MinIO for architecture: ${ARCH}" && \
    wget -q https://dl.min.io/server/minio/release/linux-${ARCH}/minio -O /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio && \
    /usr/local/bin/minio --version

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

RUN mkdir -p /data/minio /data/db /data/config /var/log/supervisor

COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80 9000 9001

ENV ROARINS3_MINIO_ENDPOINT=localhost:9000
ENV ROARINS3_DATABASE_URL=sqlite+aiosqlite:////data/db/roarins3.db
ENV MINIO_ROOT_USER=minioadmin
ENV MINIO_ROOT_PASSWORD=minioadmin

VOLUME ["/data"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
