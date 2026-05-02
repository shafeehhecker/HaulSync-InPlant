import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GateEntry from './pages/Gate/GateEntry';
import DockSchedule from './pages/Docks/DockSchedule';
import BayManagement from './pages/Bays/BayManagement';
import DetentionTracker from './pages/Detention/DetentionTracker';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="gate" element={<GateEntry />} />
        <Route path="docks" element={<DockSchedule />} />
        <Route path="bays" element={<BayManagement />} />
        <Route path="detention" element={<DetentionTracker />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
