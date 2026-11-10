import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TicketOperations from './components/TicketOperations';
import TarifasAdmin from './components/TarifasAdmin';
import UsuariosAdmin from './components/UsuariosAdmin';
import ParkingAdmin from './components/ParkingAdmin';
import HomeStats from './components/HomeStats';
import CajaCierre from './components/CajaCierre';
import Reportes from './components/Reportes';
import MensualidadesAdmin from './components/MensualidadesAdmin';
import AdminPanel from './components/AdminPanel';
import ChangePassword from './components/ChangePassword';
import PermissionsAdmin from './components/PermissionsAdmin';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Cargando sistema...
      </div>
    );
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const ModuleRoute = ({ moduleCode, children }) => {
  const { hasPermission, getDefaultRoute } = useAuth();

  if (!hasPermission(moduleCode, 'view')) {
    const fallback = getDefaultRoute();
    if (fallback && fallback !== window.location.pathname) {
      return <Navigate to={fallback} replace />;
    }
    return (
      <div className="p-8 max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl text-center">
        <div className="text-4xl mb-2">🚫</div>
        <h3 className="text-lg font-bold text-red-800">Acceso Restringido</h3>
        <p className="text-sm text-red-600 mt-1">
          Tu rol actual no tiene permisos habilitados en la base de datos para
          visualizar este módulo ({moduleCode}).
        </p>
      </div>
    );
  }

  return children;
};

const DashboardIndexRoute = () => {
  const { user, getDefaultRoute } = useAuth();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/dashboard/admin-parking" replace />;
  }
  return (
    <ModuleRoute moduleCode="DASHBOARD">
      <HomeStats />
    </ModuleRoute>
  );
};

const AdminPanelRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/dashboard/admin-parking" replace />;
  }
  return <AdminPanel />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/change-password"
        element={
          <PrivateRoute>
            <ChangePassword />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin-panel"
        element={
          <PrivateRoute>
            <AdminPanelRoute />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardIndexRoute />} />
        <Route
          path="entrada"
          element={
            <ModuleRoute moduleCode="TICKET_ENTRY">
              <TicketOperations />
            </ModuleRoute>
          }
        />
        <Route
          path="salida"
          element={
            <ModuleRoute moduleCode="TICKET_EXIT">
              <TicketOperations />
            </ModuleRoute>
          }
        />
        <Route
          path="tarifas"
          element={
            <ModuleRoute moduleCode="TARIFFS">
              <TarifasAdmin />
            </ModuleRoute>
          }
        />
        <Route
          path="caja"
          element={
            <ModuleRoute moduleCode="CASH_CLOSING">
              <CajaCierre />
            </ModuleRoute>
          }
        />
        <Route
          path="reportes"
          element={
            <ModuleRoute moduleCode="REPORTS">
              <Reportes />
            </ModuleRoute>
          }
        />
        <Route
          path="mensualidades"
          element={
            <ModuleRoute moduleCode="SUBSCRIPTIONS">
              <MensualidadesAdmin />
            </ModuleRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ModuleRoute moduleCode="USERS">
              <UsuariosAdmin />
            </ModuleRoute>
          }
        />
        <Route
          path="admin-parking"
          element={
            <ModuleRoute moduleCode="PARKINGS">
              <ParkingAdmin />
            </ModuleRoute>
          }
        />
        <Route
          path="permisos"
          element={
            <ModuleRoute moduleCode="PERMISSIONS">
              <PermissionsAdmin />
            </ModuleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
