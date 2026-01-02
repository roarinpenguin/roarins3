import { useState } from 'react';
import { Database, Key, Server, Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../api';

export default function Setup({ onSetupComplete }) {
  const [formData, setFormData] = useState({
    admin_username: 'admin',
    admin_password: '',
    admin_password_confirm: '',
    jwt_secret: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResetInfo, setShowResetInfo] = useState(false);

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateJwtSecret = () => {
    setFormData(prev => ({ ...prev, jwt_secret: generateSecret() }));
  };

  const handleGenerateLogToken = () => {
    setFormData(prev => ({ ...prev, log_api_token: generateSecret() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.admin_password !== formData.admin_password_confirm) {
      setError('Admin passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.admin_password.length < 4) {
      setError('Admin password must be at least 4 characters');
      setLoading(false);
      return;
    }

    if (!formData.jwt_secret) {
      setError('JWT Secret is required');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/setup/initialize', {
        admin_username: formData.admin_username,
        admin_password: formData.admin_password,
        jwt_secret: formData.jwt_secret,
      });
      
      setResult(response.data);
      
      if (!response.data.requires_restart) {
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-2xl w-full max-w-lg text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Setup Complete!</h1>
          <p className="text-purple-200 mb-6">{result.message}</p>
          
          <p className="text-purple-300">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-2xl w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-glow">
              <Database className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">RoarinS3</h1>
          </div>
          <p className="text-purple-200">Initial Setup - Configure your storage system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin Credentials */}
          <div className="border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-300 mb-4">
              <Shield size={20} />
              <h2 className="font-semibold">Admin Credentials</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  name="admin_username"
                  value={formData.admin_username}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div></div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                  minLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="admin_password_confirm"
                  value={formData.admin_password_confirm}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* API Security */}
          <div className="border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-300 mb-4">
              <Key size={20} />
              <h2 className="font-semibold">API Security</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">
                  JWT Secret (for session tokens)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="jwt_secret"
                    value={formData.jwt_secret}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 font-mono text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateJwtSecret}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all"
                    title="Generate random secret"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl text-white font-semibold transition-all shadow-glow disabled:opacity-50"
          >
            {loading ? 'Configuring...' : 'Complete Setup'}
          </button>
        </form>

        {/* Reset Information */}
        <div className="mt-6 pt-6 border-t border-purple-500/20">
          <button
            type="button"
            onClick={() => setShowResetInfo(!showResetInfo)}
            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
          >
            <AlertTriangle size={14} />
            How to reset the system
          </button>
          
          {showResetInfo && (
            <div className="mt-4 p-4 bg-purple-900/20 rounded-lg text-sm">
              <h3 className="font-semibold text-purple-200 mb-2">Reset Instructions</h3>
              <ol className="list-decimal list-inside text-purple-300 space-y-1">
                <li>Stop the container: <code className="bg-black/30 px-1 rounded">docker-compose down</code></li>
                <li>Remove config only: <code className="bg-black/30 px-1 rounded">docker exec roarins3 rm -f /data/config/roarins3.json</code></li>
                <li>Or remove all data: <code className="bg-black/30 px-1 rounded">docker-compose down -v</code></li>
                <li>Restart: <code className="bg-black/30 px-1 rounded">docker-compose up -d</code></li>
              </ol>
              <p className="text-yellow-400 text-xs mt-2">
                ⚠️ Using -v will delete all stored objects and audit logs!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
