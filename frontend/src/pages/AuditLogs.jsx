import { useState, useEffect } from 'react';
import {
  ScrollText,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { logs, buckets } from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const operationColors = {
  PUT: 'bg-green-500/20 text-green-300 border-green-500/30',
  GET: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  DELETE: 'bg-red-500/20 text-red-300 border-red-500/30',
  LIST: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export default function AuditLogs() {
  const [logList, setLogList] = useState([]);
  const [bucketList, setBucketList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    operation: '',
    bucket_name: '',
    success: '',
    limit: 100,
  });
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, bucketsRes] = await Promise.all([
        logs.list(buildFilterParams()),
        buckets.list(),
      ]);
      setLogList(logsRes.data);
      setBucketList(bucketsRes.data);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  const buildFilterParams = () => {
    const params = { limit: filters.limit };
    if (filters.operation) params.operation = filters.operation;
    if (filters.bucket_name) params.bucket_name = filters.bucket_name;
    if (filters.success !== '') params.success = filters.success === 'true';
    return params;
  };

  const applyFilters = () => {
    loadData();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      operation: '',
      bucket_name: '',
      success: '',
      limit: 100,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
          <p className="text-purple-300">View operation history and activity</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              showFilters
                ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                : 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-card rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Operation
              </label>
              <select
                value={filters.operation}
                onChange={(e) => setFilters({ ...filters, operation: e.target.value })}
                className="input-glass w-full px-4 py-3 rounded-xl text-white"
              >
                <option value="">All Operations</option>
                <option value="PUT">PUT</option>
                <option value="GET">GET</option>
                <option value="DELETE">DELETE</option>
                <option value="LIST">LIST</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Bucket
              </label>
              <select
                value={filters.bucket_name}
                onChange={(e) => setFilters({ ...filters, bucket_name: e.target.value })}
                className="input-glass w-full px-4 py-3 rounded-xl text-white"
              >
                <option value="">All Buckets</option>
                {bucketList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Status
              </label>
              <select
                value={filters.success}
                onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                className="input-glass w-full px-4 py-3 rounded-xl text-white"
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Limit
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                className="input-glass w-full px-4 py-3 rounded-xl text-white"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              className="glossy-button px-6 py-2 rounded-xl text-white font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : logList.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Logs Found</h3>
            <p className="text-purple-300">
              No audit logs match the current filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-left p-4 text-purple-300 font-medium">Timestamp</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Operation</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Bucket</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Object</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Status</th>
                  <th className="text-left p-4 text-purple-300 font-medium">Duration</th>
                  <th className="text-right p-4 text-purple-300 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {logList.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b border-purple-500/10 hover:bg-purple-500/5 cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <td className="p-4 text-purple-200 text-sm">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full border ${
                            operationColors[log.operation] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {log.operation}
                        </span>
                      </td>
                      <td className="p-4 text-white">{log.bucket_name || '-'}</td>
                      <td className="p-4 text-purple-300 text-sm max-w-xs truncate">
                        {log.object_key || '-'}
                      </td>
                      <td className="p-4">
                        {log.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </td>
                      <td className="p-4 text-purple-300 text-sm">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <ChevronDown
                          className={`w-5 h-5 text-purple-400 transition-transform ${
                            expandedLog === log.id ? 'rotate-180' : ''
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="bg-purple-900/20">
                        <td colSpan="7" className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-purple-400">Client IP</p>
                              <p className="text-white">{log.client_ip || '-'}</p>
                            </div>
                            <div>
                              <p className="text-purple-400">Request Size</p>
                              <p className="text-white">{formatBytes(log.request_size)}</p>
                            </div>
                            <div>
                              <p className="text-purple-400">Response Size</p>
                              <p className="text-white">{formatBytes(log.response_size)}</p>
                            </div>
                            <div>
                              <p className="text-purple-400">Status Code</p>
                              <p className="text-white">{log.status_code || '-'}</p>
                            </div>
                            {log.error_message && (
                              <div className="col-span-4">
                                <p className="text-purple-400">Error</p>
                                <p className="text-red-300">{log.error_message}</p>
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="col-span-4">
                                <p className="text-purple-400">User Agent</p>
                                <p className="text-purple-200 text-xs break-all">
                                  {log.user_agent}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
