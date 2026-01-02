from minio import Minio
from minio.error import S3Error
from app.config import get_settings
from typing import Optional, List, BinaryIO
from datetime import timedelta
import io

class MinioService:
    _client = None
    
    @property
    def client(self):
        if self._client is None:
            settings = get_settings()
            self._client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure
            )
        return self._client
    
    def bucket_exists(self, bucket_name: str) -> bool:
        try:
            return self.client.bucket_exists(bucket_name)
        except S3Error:
            return False
    
    def create_bucket(self, bucket_name: str) -> bool:
        try:
            if not self.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
            return True
        except S3Error as e:
            raise Exception(f"Failed to create bucket: {e}")
    
    def delete_bucket(self, bucket_name: str, force: bool = False) -> bool:
        try:
            if force:
                # Delete all objects and their versions
                from minio.deleteobjects import DeleteObject
                
                # First delete all object versions (including delete markers)
                objects_to_delete = []
                try:
                    objects = self.client.list_objects(
                        bucket_name, 
                        recursive=True,
                        include_version=True
                    )
                    for obj in objects:
                        objects_to_delete.append(
                            DeleteObject(obj.object_name, obj.version_id)
                        )
                except Exception:
                    # Fallback for non-versioned or if include_version fails
                    objects = self.client.list_objects(bucket_name, recursive=True)
                    for obj in objects:
                        objects_to_delete.append(DeleteObject(obj.object_name))
                
                # Batch delete
                if objects_to_delete:
                    errors = list(self.client.remove_objects(bucket_name, objects_to_delete))
                    if errors:
                        for err in errors:
                            print(f"Delete error: {err}")
            
            self.client.remove_bucket(bucket_name)
            return True
        except S3Error as e:
            raise Exception(f"S3 operation failed; code: {e.code}, message: {e.message}")
    
    def list_buckets(self) -> List[dict]:
        try:
            buckets = self.client.list_buckets()
            return [{"name": b.name, "creation_date": b.creation_date} for b in buckets]
        except S3Error as e:
            raise Exception(f"Failed to list buckets: {e}")
    
    def put_object(
        self,
        bucket_name: str,
        object_name: str,
        data: BinaryIO,
        length: int,
        content_type: str = "application/octet-stream"
    ) -> dict:
        try:
            result = self.client.put_object(
                bucket_name,
                object_name,
                data,
                length,
                content_type=content_type
            )
            return {
                "bucket": result.bucket_name,
                "object": result.object_name,
                "etag": result.etag,
                "version_id": result.version_id
            }
        except S3Error as e:
            raise Exception(f"Failed to put object: {e}")
    
    def get_object(self, bucket_name: str, object_name: str) -> tuple:
        try:
            response = self.client.get_object(bucket_name, object_name)
            data = response.read()
            content_type = response.headers.get("content-type", "application/octet-stream")
            response.close()
            response.release_conn()
            return data, content_type
        except S3Error as e:
            raise Exception(f"Failed to get object: {e}")
    
    def delete_object(self, bucket_name: str, object_name: str) -> bool:
        try:
            self.client.remove_object(bucket_name, object_name)
            return True
        except S3Error as e:
            raise Exception(f"Failed to delete object: {e}")
    
    def list_objects(
        self,
        bucket_name: str,
        prefix: Optional[str] = None,
        recursive: bool = True
    ) -> List[dict]:
        try:
            objects = self.client.list_objects(
                bucket_name,
                prefix=prefix,
                recursive=recursive
            )
            return [{
                "name": obj.object_name,
                "size": obj.size,
                "etag": obj.etag,
                "last_modified": obj.last_modified,
                "is_dir": obj.is_dir
            } for obj in objects]
        except S3Error as e:
            raise Exception(f"Failed to list objects: {e}")
    
    def get_object_stat(self, bucket_name: str, object_name: str) -> dict:
        try:
            stat = self.client.stat_object(bucket_name, object_name)
            return {
                "size": stat.size,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified,
                "metadata": stat.metadata
            }
        except S3Error as e:
            raise Exception(f"Failed to get object stat: {e}")
    
    def get_presigned_url(
        self,
        bucket_name: str,
        object_name: str,
        expires: timedelta = timedelta(hours=1)
    ) -> str:
        try:
            return self.client.presigned_get_object(bucket_name, object_name, expires=expires)
        except S3Error as e:
            raise Exception(f"Failed to generate presigned URL: {e}")
    
    def get_bucket_size(self, bucket_name: str) -> int:
        try:
            total_size = 0
            objects = self.client.list_objects(bucket_name, recursive=True)
            for obj in objects:
                total_size += obj.size
            return total_size
        except S3Error as e:
            return 0
    
    def set_bucket_versioning(self, bucket_name: str, enabled: bool) -> bool:
        try:
            from minio.versioningconfig import VersioningConfig, ENABLED, SUSPENDED
            config = VersioningConfig(ENABLED if enabled else SUSPENDED)
            self.client.set_bucket_versioning(bucket_name, config)
            return True
        except S3Error as e:
            raise Exception(f"Failed to set versioning: {e}")
    
    def set_bucket_lifecycle(self, bucket_name: str, days: Optional[int]) -> bool:
        try:
            if days is None:
                self.client.delete_bucket_lifecycle(bucket_name)
            else:
                from minio.lifecycleconfig import LifecycleConfig, Rule, Expiration
                config = LifecycleConfig([
                    Rule(
                        rule_id="auto-expire",
                        status="Enabled",
                        expiration=Expiration(days=days)
                    )
                ])
                self.client.set_bucket_lifecycle(bucket_name, config)
            return True
        except S3Error as e:
            raise Exception(f"Failed to set lifecycle: {e}")


minio_service = MinioService()
