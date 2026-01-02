# RoarinS3

An on-premises S3-compatible object storage solution with a management UI and audit logging API.

![RoarinS3](https://img.shields.io/badge/Storage-S3%20Compatible-purple)
![License](https://img.shields.io/badge/License-GPL--3.0-blue)

## Features

- **S3-Compatible Storage** - Powered by MinIO, fully compatible with S3 APIs and tools
- **Management UI** - Sleek purple-themed interface for managing buckets, objects, and API keys
- **Audit Logging** - Detailed logging of all operations (PUT, GET, DELETE, LIST)
- **Token-Based Log API** - Pull logs incrementally with automatic cursor tracking
- **Archival Features** - Lifecycle rules, versioning, and quotas

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone and start
git clone <repository>
cd roarins3
docker-compose up -d

# Access the UI
open http://localhost
```

### Default Credentials

- **Admin UI**: `admin` / `admin`
- **MinIO S3**: `minioadmin` / `minioadmin`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   RoarinS3 Container                │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Nginx     │  │  FastAPI    │  │   MinIO     │ │
│  │   (Port 80) │  │  (Port 8000)│  │  (Port 9000)│ │
│  │             │  │             │  │             │ │
│  │  Frontend   │  │  Management │  │  S3 Storage │ │
│  │  + Proxy    │  │  API        │  │  Engine     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                         │                │         │
│                    ┌────┴────────────────┴───┐     │
│                    │      SQLite DB          │     │
│                    │   (Audit Logs, Config)  │     │
│                    └─────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 80 | Nginx | Web UI and Management API |
| 9000 | MinIO | S3-compatible API endpoint |
| 9001 | MinIO Console | MinIO's native admin UI (optional) |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MINIO_ROOT_USER` | minioadmin | MinIO root username |
| `MINIO_ROOT_PASSWORD` | minioadmin | MinIO root password |
| `ROARINS3_SECRET_KEY` | (generated) | JWT signing key |
| `ROARINS3_LOG_RETENTION_DAYS` | 90 | Days to retain audit logs |

### Using with S3 Tools

```bash
# AWS CLI
aws configure set aws_access_key_id <ACCESS_KEY>
aws configure set aws_secret_access_key <SECRET_KEY>
aws --endpoint-url http://localhost:9000 s3 ls

# Python boto3
import boto3
s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='<ACCESS_KEY>',
    aws_secret_access_key='<SECRET_KEY>'
)
```

## Log Pull API

External systems can pull audit logs using tokens:

```bash
# Create a token via the UI, then:
curl "http://localhost/api/pull?token=YOUR_TOKEN"

# With filters
curl "http://localhost/api/pull?token=YOUR_TOKEN&operation=PUT&bucket_name=my-bucket"
```

### Response Format

```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "operation": "PUT",
      "bucket_name": "my-bucket",
      "object_key": "file.txt",
      "client_ip": "192.168.1.100",
      "request_size": 1024,
      "duration_ms": 45,
      "success": true
    }
  ],
  "last_id": 1,
  "has_more": false,
  "total_returned": 1
}
```

The token automatically tracks the last pulled log ID, so subsequent calls return only new logs.

## Development

### Backend Only

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

### Full Stack (Development)

Run MinIO separately:
```bash
docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
```

Then run backend and frontend as above.

## API Documentation

Once running, access the OpenAPI documentation at:
- Swagger UI: http://localhost/docs
- OpenAPI JSON: http://localhost/openapi.json

## Security Notes

1. **Change default passwords** before production use
2. **Set a strong `ROARINS3_SECRET_KEY`** for JWT signing
3. **Use HTTPS** in production (configure nginx or use a reverse proxy)
4. **Restrict network access** to ports 9000/9001 if not needed externally

## License

GPL-3.0 - See LICENSE file for details.
