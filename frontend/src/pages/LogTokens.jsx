import { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  X,
  Code,
} from 'lucide-react';
import { logTokens } from '../api';

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

export default function LogTokens() {
  const [tokenList, setTokenList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);
  const [showUsage, setShowUsage] = useState(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await logTokens.list();
      setTokenList(response.data);
    } catch (err) {
      console.error('Failed to load tokens', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await logTokens.create({ name: newTokenName });
      setCreatedToken(response.data);
      setShowCreate(false);
      setNewTokenName('');
      loadTokens();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (tokenId) => {
    try {
      await logTokens.reset(tokenId);
      loadTokens();
    } catch (err) {
      alert('Failed to reset token cursor');
    }
  };

  const handleDelete = async () => {
    try {
      await logTokens.delete(deleteTarget);
      setDeleteTarget(null);
      loadTokens();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete token');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getUsageExample = (token) => {
    return `# Pull logs since last request
curl -X GET "http://localhost:8000/api/pull?token=${token}"

# Pull with filters
curl -X GET "http://localhost:8000/api/pull?token=${token}&operation=PUT&bucket_name=my-bucket"

# Python example
import requests

response = requests.get(
    "http://localhost:8000/api/pull",
    params={"token": "${token}"}
)
logs = response.json()
print(f"Retrieved {logs['total_returned']} logs")`;
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
          <h1 className="text-3xl font-bold text-white mb-2">Log Tokens</h1>
          <p className="text-purple-300">Manage tokens for the log pull API</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="glossy-button flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
        >
          <Plus size={18} />
          Create Token
        </button>
      </div>

      {/* Info Card */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">About Log Tokens</h3>
        <p className="text-purple-300 text-sm">
          Log tokens allow external systems to pull audit logs via API. Each token maintains
          a cursor that tracks the last pulled log, so subsequent calls automatically return
          only new logs. This enables efficient incremental log collection without managing state
          on the client side.
        </p>
      </div>

      {/* Tokens List */}
      {tokenList.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Coins className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Log Tokens</h3>
          <p className="text-purple-300 mb-6">
            Create a token to enable external log collection
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="glossy-button px-6 py-3 rounded-xl text-white font-medium"
          >
            Create Token
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tokenList.map((token) => (
            <div key={token.id} className="glass-card rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{token.name}</h3>
                    <p className="text-purple-300 text-sm font-mono mt-1">
                      {token.token.substring(0, 20)}...
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-purple-400">Last Pull: </span>
                        <span className="text-purple-200">{formatDate(token.last_pull_at)}</span>
                      </div>
                      <div>
                        <span className="text-purple-400">Cursor: </span>
                        <span className="text-purple-200">#{token.last_pulled_id}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(token.token, token.id)}
                    className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-300"
                    title="Copy Token"
                  >
                    {copiedToken === token.id ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => setShowUsage(showUsage === token.id ? null : token.id)}
                    className={`p-2 rounded-lg transition-all ${
                      showUsage === token.id
                        ? 'bg-purple-500/20 text-purple-200'
                        : 'hover:bg-purple-500/20 text-purple-300'
                    }`}
                    title="Show Usage"
                  >
                    <Code size={18} />
                  </button>
                  <button
                    onClick={() => handleReset(token.id)}
                    className="p-2 rounded-lg hover:bg-orange-500/20 text-orange-300"
                    title="Reset Cursor"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(token.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-300"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {showUsage === token.id && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <h4 className="text-sm font-medium text-purple-200 mb-2">Usage Examples</h4>
                  <pre className="bg-purple-900/30 rounded-lg p-4 text-sm text-purple-200 overflow-x-auto">
                    {getUsageExample(token.token)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create Log Token</h2>
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
                  Token Name *
                </label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="input-glass w-full px-4 py-3 rounded-xl text-white"
                  placeholder="e.g., siem-integration"
                  required
                />
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

      {/* Created Token Modal */}
      {createdToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Token Created</h2>
                <p className="text-purple-300 text-sm">{createdToken.name}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={createdToken.token}
                  readOnly
                  className="input-glass flex-1 px-4 py-3 rounded-xl text-white font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(createdToken.token, 'new-token')}
                  className="p-3 rounded-xl hover:bg-purple-500/20 text-purple-300"
                >
                  {copiedToken === 'new-token' ? (
                    <Check size={18} className="text-green-400" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedToken(null)}
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
            <h2 className="text-xl font-semibold text-white mb-4">Delete Log Token</h2>
            <p className="text-purple-200 mb-6">
              Are you sure you want to delete this log token? External systems using it will no
              longer be able to pull logs.
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
