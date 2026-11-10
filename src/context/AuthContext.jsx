import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const res = await axios.get('/api/auth/profile');
          setUser(res.data);
        } catch (error) {
          console.error('Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const refreshProfile = async () => {
    const res = await axios.get('/api/auth/profile');
    setUser(res.data);
    return res.data;
  };

  const computeDefaultRoute = (profile) => {
    if (!profile || !Array.isArray(profile.permissions)) return '/dashboard';
    const visible = profile.permissions.filter((p) => p.canView);
    if (profile.role === 'SUPER_ADMIN') {
      const parkingsPerm = visible.find((p) => p.moduleCode === 'PARKINGS');
      if (parkingsPerm) return parkingsPerm.route || '/dashboard/admin-parking';
      return visible[0]?.route || '/dashboard/admin-parking';
    }
    const dashboardPerm = visible.find((p) => p.moduleCode === 'DASHBOARD');
    if (dashboardPerm) return dashboardPerm.route || '/dashboard';
    return visible[0]?.route || '/dashboard';
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { accessToken } = res.data;

      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      const profileRes = await axios.get('/api/auth/profile');
      setUser(profileRes.data);
      setToken(accessToken);
      return {
        success: true,
        mustChangePassword: !!profileRes.data?.mustChangePassword,
        defaultRoute: computeDefaultRoute(profileRes.data),
      };
    } catch (e) {
      console.error(e);
      return { success: false, mustChangePassword: false, defaultRoute: '/dashboard' };
    }
  };

  const switchParking = async (targetParkingId) => {
    try {
      const res = await axios.post('/api/auth/switch-parking', { targetParkingId });
      const { accessToken } = res.data;

      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      const profileRes = await axios.get('/api/auth/profile');
      setUser(profileRes.data);
      setToken(accessToken);
      return true;
    } catch (error) {
      console.error('Switch failed', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await axios.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    const { accessToken } = res.data;
    localStorage.setItem('token', accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setToken(accessToken);
    await refreshProfile();
    return true;
  };

  const hasPermission = useCallback(
    (moduleCode, action = 'view') => {
      if (!user || !Array.isArray(user.permissions)) return false;
      const perm = user.permissions.find((p) => p.moduleCode === moduleCode);
      if (!perm) return false;

      switch (action) {
        case 'view':
          return Boolean(perm.canView);
        case 'create':
          return Boolean(perm.canView && perm.canCreate);
        case 'edit':
          return Boolean(perm.canView && perm.canEdit);
        case 'delete':
          return Boolean(perm.canView && perm.canDelete);
        default:
          return Boolean(perm.canView);
      }
    },
    [user],
  );

  const getDefaultRoute = useCallback(() => {
    return computeDefaultRoute(user);
  }, [user]);

  const value = {
    user,
    token,
    login,
    logout,
    switchParking,
    changePassword,
    refreshProfile,
    hasPermission,
    getDefaultRoute,
    loading,
    isAuth: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
