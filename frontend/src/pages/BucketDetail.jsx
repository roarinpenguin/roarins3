import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  FileText,
  Folder,
  RefreshCw,
  Search,
  X,
  Copy,
  Terminal,
} from 'lucide-react';
import { buckets, objects } from '../api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

export default function BucketDetail() {
  const { bucketName } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [bucket, setBucket] = useState(null);
  const [objectList, setObjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showS3Info, setShowS3Info] = useState(false);

  const s3Endpoint = `${window.location.protocol}//${window.location.hostname}:9000`;
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    loadData();
  }, [bucketName]);

  const loadData = async () => {
    try {
      const [bucketRes, objectsRes] = await Promise.all([
        buckets.get(bucketName),
        objects.list(bucketName),
      ]);
      setBucket(bucketRes.data);
      setObjectList(objectsRes.data);
    } catch (err) {
      console.error('Failed to load bucket data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await objects.upload(bucketName, file.name, file);
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (objectKey) => {
    try {
      const response = await objects.download(bucketName, objectKey);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', objectKey.split('/').pop());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file');
    }
  };

  const handleDelete = async () => {
    try {
      await objects.delete(bucketName, deleteTarget);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete object');
    }
  };

  const filteredObjects = objectList.filter((obj) =>
    obj.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/buckets')}
          className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{bucketName}</h1>
          <p className="text-purple-300">
            {bucket?.object_count || 0} objects • {formatBytes(bucket?.current_size)}
          </p>
        </div>
      </div>

      {/* Bucket Info */}
      <div className="glass-card rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-purple-400 text-sm">Versioning</p>
            <p className="text-white font-medium">
              {bucket?.versioning_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div>
            <p className="text-purple-400 text-sm">Lifecycle</p>
            <p className="text-white font-medium">
              {bucket?.lifecycle_days ? `${bucket.lifecycle_days} days` : 'No expiration'}
            </p>
          </div>
          <div>
            <p className="text-purple-400 text-sm">Quota</p>
            <p className="text-white font-medium">
              {bucket?.quota_bytes ? formatBytes(bucket.quota_bytes) : 'Unlimited'}
            </p>
          </div>
          <div>
            <p className="text-purple-400 text-sm">Created</p>
            <p className="text-white font-medium">
              {formatDate(bucket?.created_at)}
            </p>
          </div>
        </div>
        
        {/* S3 Access Toggle */}
        <div className="mt-4 pt-4 border-t border-purple-500/20">
          <button
            onClick={() => setShowS3Info(!showS3Info)}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-200"
          >
            <Terminal size={18} />
            {showS3Info ? 'Hide' : 'Show'} S3 Access Info
          </button>
          
          {showS3Info && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-purple-400 text-sm mb-1">S3 Endpoint URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 px-3 py-2 rounded-lg text-purple-100 text-sm font-mono">
                    {s3Endpoint}
                  </code>
                  <button
                    onClick={() => copyToClipboard(s3Endpoint)}
                    className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-purple-400 text-sm mb-1">Bucket URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 px-3 py-2 rounded-lg text-purple-100 text-sm font-mono">
                    {s3Endpoint}/{bucketName}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${s3Endpoint}/${bucketName}`)}
                    className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-purple-400 text-sm mb-2">Example Commands (AWS CLI)</p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="bg-black/30 p-3 rounded-lg">
                    <p className="text-purple-400 mb-1"># List objects</p>
                    <p className="text-purple-100">aws --endpoint-url {s3Endpoint} s3 ls s3://{bucketName}/</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg">
                    <p className="text-purple-400 mb-1"># Upload file</p>
                    <p className="text-purple-100">aws --endpoint-url {s3Endpoint} s3 cp myfile.txt s3://{bucketName}/</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg">
                    <p className="text-purple-400 mb-1"># Download file</p>
                    <p className="text-purple-100">aws --endpoint-url {s3Endpoint} s3 cp s3://{bucketName}/myfile.txt ./</p>
                  </div>
                </div>
                <p className="text-purple-400 text-xs mt-2">
                  Configure credentials first: aws configure (use MinIO access key and secret)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-glass w-full pl-11 pr-4 py-3 rounded-xl text-white"
            placeholder="Search objects..."
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="glossy-button flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50"
          >
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Objects List */}
      <div className="glass-card rounded-xl overflow-hidden">
        {filteredObjects.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? 'No matching objects' : 'No Objects'}
            </h3>
            <p className="text-purple-300">
              {searchTerm ? 'Try a different search term' : 'Upload files to this bucket'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-left p-4 text-purple-300 font-medium">Name</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Size</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Last Modified</th>
                  <th className="text-right p-4 text-purple-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredObjects.map((obj) => (
                  <tr
                    key={obj.name}
                    className="border-b border-purple-500/10 hover:bg-purple-500/5"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {obj.is_dir ? (
                          <Folder className="w-5 h-5 text-purple-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-purple-400" />
                        )}
                        <span className="text-white">{obj.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-purple-300">
                      {obj.is_dir ? '-' : formatBytes(obj.size)}
                    </td>
                    <td className="p-4 text-purple-300">
                      {formatDate(obj.last_modified)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {!obj.is_dir && (
                          <button
                            onClick={() => handleDownload(obj.name)}
                            className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
                            title="Download"
                          >
                            <Download size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(obj.name)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-red-300"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Delete Object</h2>
            <p className="text-purple-200 mb-2">Are you sure you want to delete:</p>
            <p className="text-white font-mono text-sm bg-purple-900/30 p-3 rounded-lg mb-6 break-all">
              {deleteTarget}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
