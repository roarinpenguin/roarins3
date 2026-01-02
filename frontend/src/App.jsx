import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Buckets from './pages/Buckets';
import BucketDetail from './pages/BucketDetail';
import ApiKeys from './pages/ApiKeys';
import AuditLogs from './pages/AuditLogs';
import LogTokens from './pages/LogTokens';
import Layout from './components/Layout';
import api from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await api.get('/setup/status');
        setIsConfigured(response.data.is_configured);
      } catch (err) {
        setIsConfigured(false);
      }
      
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setLoading(false);
    };
    
    checkSetup();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  // Show setup wizard if not configured
  if (!isConfigured) {
    return <Setup onSetupComplete={() => setIsConfigured(true)} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login onLogin={() => setIsAuthenticated(true)} />
          )
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Layout onLogout={() => setIsAuthenticated(false)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="buckets" element={<Buckets />} />
        <Route path="buckets/:bucketName" element={<BucketDetail />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="logs" element={<AuditLogs />} />
        <Route path="log-tokens" element={<LogTokens />} />
      </Route>
    </Routes>
  );
}

export default App;
