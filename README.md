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
open http://localhost:8080
```

### First-Time Setup

On first access, you'll see a **Setup Wizard** to configure:

- **Admin credentials** - Username and password for the management UI
- **JWT Secret** - For secure session tokens (use the generate button)

MinIO credentials are set via environment variables in `docker-compose.yml` (default: `minioadmin/minioadmin`).

### Accessing Buckets via S3

Once you create a bucket, click **"Show S3 Access Info"** in the bucket detail page to see:
- S3 endpoint URL
- Bucket URL  
- Example AWS CLI commands for upload/download

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   RoarinS3 Container                │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Nginx     │  │  FastAPI    │  │   MinIO     │  │
│  │   (Port 80) │  │  (Port 8000)│  │  (Port 9000)│  │
│  │             │  │             │  │             │  │
│  │  Frontend   │  │  Management │  │  S3 Storage │  │
│  │  + Proxy    │  │  API        │  │  Engine     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                         │                │          │
│                    ┌────┴────────────────┴───┐      │
│                    │      SQLite DB          │      │
│                    │   (Audit Logs, Config)  │      │
│                    └─────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 8080 | Nginx | Web UI and Management API |
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

### Using with AWS CLI

#### Step 1: Create API Key in RoarinS3

1. Log into the RoarinS3 UI at `http://<HOST>:8080`
2. Go to **API Keys** → **Create Key**
3. Give it a name and select which buckets it can access
4. **Important**: Copy both the **Access Key** and **Secret Key** - the secret is only shown once!

#### Step 2: Configure AWS CLI

```bash
aws configure
```

Enter the following when prompted:
- **AWS Access Key ID**: Your RoarinS3 Access Key
- **AWS Secret Access Key**: Your RoarinS3 Secret Key
- **Default region name**: `us-east-1` (MinIO ignores this, but AWS CLI requires it)
- **Default output format**: `json`

#### Step 3: Use AWS CLI with MinIO Endpoint

Every command needs the `--endpoint-url` parameter:

```bash
# List all buckets
aws --endpoint-url http://<HOST>:9000 s3 ls

# List objects in a bucket
aws --endpoint-url http://<HOST>:9000 s3 ls s3://my-bucket

# Upload a file
aws --endpoint-url http://<HOST>:9000 s3 cp myfile.txt s3://my-bucket/

# Upload a folder recursively
aws --endpoint-url http://<HOST>:9000 s3 cp ./myfolder s3://my-bucket/myfolder --recursive

# Download a file
aws --endpoint-url http://<HOST>:9000 s3 cp s3://my-bucket/myfile.txt ./

# Delete a file
aws --endpoint-url http://<HOST>:9000 s3 rm s3://my-bucket/myfile.txt

# Sync a local folder to bucket
aws --endpoint-url http://<HOST>:9000 s3 sync ./local-folder s3://my-bucket/remote-folder
```

#### Quick Test (Using MinIO Root Credentials)

For quick testing without creating API keys, use the MinIO root credentials:

```bash
aws configure
# Access Key ID: minioadmin
# Secret Access Key: minioadmin
# Region: us-east-1
# Output: json

aws --endpoint-url http://localhost:9000 s3 ls
```

### Using with Python (boto3)

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://<HOST>:9000',
    aws_access_key_id='<ACCESS_KEY>',
    aws_secret_access_key='<SECRET_KEY>'
)

# List buckets
buckets = s3.list_buckets()
for bucket in buckets['Buckets']:
    print(bucket['Name'])

# Upload a file
s3.upload_file('local_file.txt', 'my-bucket', 'remote_file.txt')

# Download a file
s3.download_file('my-bucket', 'remote_file.txt', 'local_file.txt')
```

## Log Pull API

External systems can pull audit logs using tokens:

```bash
# Create a token via the UI, then:
curl "http://localhost:8080/api/pull?token=YOUR_TOKEN"

# With filters
curl "http://localhost:8080/api/pull?token=YOUR_TOKEN&operation=PUT&bucket_name=my-bucket"
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
- Swagger UI: http://localhost:8080/docs
- OpenAPI JSON: http://localhost:8080/openapi.json

## Resetting the System

If you forget your password or need to reconfigure:

```bash
# Reset config only (keeps data)
docker exec roarins3 rm -f /data/config/roarins3.json
docker-compose restart

# Full reset (deletes all data)
docker-compose down -v
docker-compose up -d
```

## Security Notes

1. **Configure strong passwords** during initial setup
2. **Use the generated JWT secret** or create a strong one
3. **Use HTTPS** in production (configure nginx or use a reverse proxy)
4. **Restrict network access** to ports 9000/9001 if not needed externally

## License

GPL-3.0 - See LICENSE file for details.
