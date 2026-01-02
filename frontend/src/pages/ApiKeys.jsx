import { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Power,
  X,
  AlertTriangle,
} from 'lucide-react';
import { apiKeys, buckets } from '../api';

export default function ApiKeys() {
  const [keyList, setKeyList] = useState([]);
  const [bucketList, setBucketList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', permissions: [] });
  const [createdKey, setCreatedKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keysRes, bucketsRes] = await Promise.all([
        apiKeys.list(),
        buckets.list(),
      ]);
      setKeyList(keysRes.data);
      setBucketList(bucketsRes.data);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await apiKeys.create(newKey);
      setCreatedKey(response.data);
      setShowCreate(false);
      setNewKey({ name: '', permissions: [] });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (key) => {
    try {
      if (key.is_active) {
        await apiKeys.deactivate(key.id);
      } else {
        await apiKeys.activate(key.id);
      }
      loadData();
    } catch (err) {
      alert('Failed to update API key status');
    }
  };

  const handleDelete = async () => {
    try {
      await apiKeys.delete(deleteTarget);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePermission = (bucketName) => {
    setNewKey((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(bucketName)
        ? prev.permissions.filter((p) => p !== bucketName)
        : [...prev.permissions, bucketName],
    }));
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
          <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
          <p className="text-purple-300">Manage access credentials for S3 operations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="glossy-button flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
        >
          <Plus size={18} />
          Create API Key
        </button>
      </div>

      {/* Keys List */}
      {keyList.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Key className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No API Keys</h3>
          <p className="text-purple-300 mb-6">Create your first API key to enable S3 access</p>
          <button
            onClick={() => setShowCreate(true)}
            className="glossy-button px-6 py-3 rounded-xl text-white font-medium"
          >
            Create API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {keyList.map((key) => (
            <div key={key.id} className="glass-card rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      key.is_active
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                        : 'bg-gray-600'
                    }`}
                  >
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{key.name}</h3>
                      {!key.is_active && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-purple-300 text-sm font-mono mt-1">{key.access_key}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {key.permissions?.length > 0 ? (
                        key.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          >
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-purple-400 text-sm">No bucket permissions</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(key.access_key, `access-${key.id}`)}
                    className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
                    title="Copy Access Key"
                  >
                    {copiedField === `access-${key.id}` ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(key)}
                    className={`p-2 rounded-lg transition-all ${
                      key.is_active
                        ? 'hover:bg-orange-500/20 text-orange-300'
                        : 'hover:bg-green-500/20 text-green-300'
                    }`}
                    title={key.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <Power size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(key.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-300"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {key.last_used && (
                <p className="text-purple-400 text-xs mt-4">
                  Last used: {new Date(key.last_used).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create API Key</h2>
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
                  Key Name *
                </label>
                <input
                  type="text"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  className="input-glass w-full px-4 py-3 rounded-xl text-white"
                  placeholder="e.g., backup-service"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Bucket Permissions
                </label>
                {bucketList.length === 0 ? (
                  <p className="text-purple-400 text-sm">No buckets available</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bucketList.map((bucket) => (
                      <label
                        key={bucket.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-purple-900/30 cursor-pointer hover:bg-purple-900/50"
                      >
                        <input
                          type="checkbox"
                          checked={newKey.permissions.includes(bucket.name)}
                          onChange={() => togglePermission(bucket.name)}
                          className="w-4 h-4 rounded border-purple-500 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">{bucket.name}</span>
                      </label>
                    ))}
                  </div>
                )}
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

      {/* Created Key Modal */}
      {createdKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">API Key Created</h2>
                <p className="text-purple-300 text-sm">{createdKey.name}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Access Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={createdKey.access_key}
                    readOnly
                    className="input-glass flex-1 px-4 py-3 rounded-xl text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(createdKey.access_key, 'new-access')}
                    className="p-3 rounded-xl hover:bg-purple-500/20 text-purple-300"
                  >
                    {copiedField === 'new-access' ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Secret Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={createdKey.secret_key}
                    readOnly
                    className="input-glass flex-1 px-4 py-3 rounded-xl text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(createdKey.secret_key, 'new-secret')}
                    className="p-3 rounded-xl hover:bg-purple-500/20 text-purple-300"
                  >
                    {copiedField === 'new-secret' ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
                <p className="text-orange-300 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Save these credentials now. The secret key won't be shown again.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="w-full mt-6 py-3 rounded-xl glossy-button text-white font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Delete API Key</h2>
            <p className="text-purple-200 mb-6">
              Are you sure you want to delete this API key? Any services using it will lose access.
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
