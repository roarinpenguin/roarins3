import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Plus,
  Trash2,
  Settings,
  Eye,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';
import { buckets } from '../api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Buckets() {
  const navigate = useNavigate();
  const [bucketList, setBucketList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newBucket, setNewBucket] = useState({
    name: '',
    description: '',
    versioning_enabled: false,
    lifecycle_days: '',
    quota_bytes: '',
    is_public: false,
  });

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    try {
      const response = await buckets.list();
      setBucketList(response.data);
    } catch (err) {
      console.error('Failed to load buckets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        name: newBucket.name,
        description: newBucket.description || null,
        versioning_enabled: newBucket.versioning_enabled,
        lifecycle_days: newBucket.lifecycle_days ? parseInt(newBucket.lifecycle_days) : null,
        quota_bytes: newBucket.quota_bytes ? parseInt(newBucket.quota_bytes) * 1024 * 1024 : null,
        is_public: newBucket.is_public,
      };
      await buckets.create(payload);
      setShowCreate(false);
      setNewBucket({
        name: '',
        description: '',
        versioning_enabled: false,
        lifecycle_days: '',
        quota_bytes: '',
        is_public: false,
      });
      loadBuckets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create bucket');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (force = false) => {
    try {
      await buckets.delete(deleteTarget, force);
      setDeleteTarget(null);
      loadBuckets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete bucket');
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Buckets</h1>
          <p className="text-purple-300">Manage your storage buckets</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadBuckets}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="glossy-button flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          >
            <Plus size={18} />
            Create Bucket
          </button>
        </div>
      </div>

      {/* Buckets Grid */}
      {bucketList.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Database className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Buckets</h3>
          <p className="text-purple-300 mb-6">Create your first bucket to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="glossy-button px-6 py-3 rounded-xl text-white font-medium"
          >
            Create Bucket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bucketList.map((bucket) => (
            <div
              key={bucket.id}
              className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all cursor-pointer"
              onClick={() => navigate(`/buckets/${bucket.name}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div className="flex gap-2">
                  {bucket.versioning_enabled && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Versioned
                    </span>
                  )}
                  {bucket.is_public && (
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Public
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{bucket.name}</h3>
              {bucket.description && (
                <p className="text-purple-300 text-sm mb-3 line-clamp-2">
                  {bucket.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-purple-400">Objects</p>
                  <p className="text-white font-medium">{bucket.object_count || 0}</p>
                </div>
                <div>
                  <p className="text-purple-400">Size</p>
                  <p className="text-white font-medium">
                    {formatBytes(bucket.current_size)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-purple-500/20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/buckets/${bucket.name}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
                >
                  <Eye size={16} />
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(bucket.name);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create Bucket</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Bucket Name *
                </label>
                <input
                  type="text"
                  value={newBucket.name}
                  onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value.toLowerCase() })}
                  className="input-glass w-full px-4 py-3 rounded-xl text-white"
                  placeholder="my-bucket"
                  pattern="^[a-z0-9][a-z0-9.-]*[a-z0-9]$"
                  required
                />
                <p className="text-xs text-purple-400 mt-1">
                  Lowercase letters, numbers, dots, and hyphens only
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Description
                </label>
                <textarea
                  value={newBucket.description}
                  onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                  className="input-glass w-full px-4 py-3 rounded-xl text-white resize-none"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Lifecycle (auto-delete after days)
                </label>
                <input
                  type="number"
                  value={newBucket.lifecycle_days}
                  onChange={(e) => setNewBucket({ ...newBucket, lifecycle_days: e.target.value })}
                  className="input-glass w-full px-4 py-3 rounded-xl text-white"
                  placeholder="Leave empty for no expiration"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Quota (MB)
                </label>
                <input
                  type="number"
                  value={newBucket.quota_bytes}
                  onChange={(e) => setNewBucket({ ...newBucket, quota_bytes: e.target.value })}
                  className="input-glass w-full px-4 py-3 rounded-xl text-white"
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBucket.versioning_enabled}
                    onChange={(e) => setNewBucket({ ...newBucket, versioning_enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-purple-500 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-purple-200 text-sm">Enable Versioning</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 glossy-button py-3 rounded-xl text-white font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Delete Bucket</h2>
                <p className="text-purple-300 text-sm">{deleteTarget}</p>
              </div>
            </div>
            <p className="text-purple-200 mb-6">
              Are you sure you want to delete this bucket? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(false)}
                className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
              >
                Delete Empty
              </button>
              <button
                onClick={() => handleDelete(true)}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Force Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
