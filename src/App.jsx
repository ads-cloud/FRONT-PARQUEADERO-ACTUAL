import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TicketEntry from './components/TicketEntry';
import TicketExit from './components/TicketExit';
import TarifasAdmin from './components/TarifasAdmin';
import UsuariosAdmin from './components/UsuariosAdmin';
import ParkingAdmin from './components/ParkingAdmin';
import HomeStats from './components/HomeStats';
import CajaCierre from './components/CajaCierre';
import Reportes from './components/Reportes';
import MensualidadesAdmin from './components/MensualidadesAdmin';
import AdminPanel from './components/AdminPanel';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Cargando sistema...</div>;
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-panel" element={
            <PrivateRoute>
                <AdminPanel />
            </PrivateRoute>
        } />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }>
          <Route index element={<HomeStats />} />
          <Route path="entrada" element={<TicketEntry />} />
          <Route path="salida" element={<TicketExit />} />
          <Route path="tarifas" element={<TarifasAdmin />} />
          <Route path="caja" element={<CajaCierre />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="mensualidades" element={<MensualidadesAdmin />} />
          <Route path="usuarios" element={<UsuariosAdmin />} />
          <Route path="admin-parking" element={<ParkingAdmin />} />
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