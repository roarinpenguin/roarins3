import { useState, useEffect } from 'react';
import {
  Database,
  FileText,
  Key,
  Activity,
  AlertTriangle,
  HardDrive,
  TrendingUp,
} from 'lucide-react';
import { dashboard } from '../api';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function StatCard({ icon: Icon, label, value, subValue, color = 'purple' }) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-700',
    blue: 'from-blue-500 to-blue-700',
    green: 'from-green-500 to-green-700',
    orange: 'from-orange-500 to-orange-700',
    red: 'from-red-500 to-red-700',
  };

  return (
    <div className="glass-card rounded-xl p-6 transition-all hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-purple-300 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="text-purple-400 text-sm mt-1">{subValue}</p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboard.getStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-purple-300">Overview of your storage system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Database}
          label="Total Buckets"
          value={stats?.total_buckets || 0}
          color="purple"
        />
        <StatCard
          icon={FileText}
          label="Total Objects"
          value={stats?.total_objects || 0}
          subValue={formatBytes(stats?.total_size_bytes || 0)}
          color="blue"
        />
        <StatCard
          icon={Key}
          label="API Keys"
          value={`${stats?.active_api_keys || 0} / ${stats?.total_api_keys || 0}`}
          subValue="active / total"
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Operations Today"
          value={stats?.operations_today || 0}
          subValue={`${stats?.operations_this_week || 0} this week`}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-300">Used Space</span>
                <span className="text-white font-medium">
                  {formatBytes(stats?.total_size_bytes || 0)}
                </span>
              </div>
              <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                  style={{ width: '35%' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-purple-400">Objects</p>
                <p className="text-white font-medium text-lg">
                  {stats?.total_objects || 0}
                </p>
              </div>
              <div>
                <p className="text-purple-400">Buckets</p>
                <p className="text-white font-medium text-lg">
                  {stats?.total_buckets || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Activity Summary</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-purple-900/30">
              <span className="text-purple-300">Operations Today</span>
              <span className="text-white font-bold text-xl">
                {stats?.operations_today || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-purple-900/30">
              <span className="text-purple-300">This Week</span>
              <span className="text-white font-bold text-xl">
                {stats?.operations_this_week || 0}
              </span>
            </div>
            {stats?.recent_errors > 0 && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-red-900/30 border border-red-500/30">
                <span className="text-red-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Recent Errors
                </span>
                <span className="text-red-300 font-bold text-xl">
                  {stats.recent_errors}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
