import React, { createContext, useContext, useState, useEffect } from 'react';
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
            console.error("Session expired or invalid");
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

  const login = async (username, password) => {
    try {
        const res = await axios.post('/api/auth/login', { username, password });
        const { access_token } = res.data; 
        
        localStorage.setItem('token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

        // Fetch user details immediately
        const profileRes = await axios.get('/api/auth/profile');
        setUser(profileRes.data);
        setToken(access_token);
        return {
          success: true,
          mustChangePassword: !!profileRes.data?.mustChangePassword,
        };
    } catch (e) {
        console.error(e);
        return { success: false, mustChangePassword: false };
    }
  };

  const switchParking = async (targetParkingId) => {
      try {
          const res = await axios.post('/api/auth/switch-parking', { targetParkingId });
          const { access_token } = res.data;
          
          localStorage.setItem('token', access_token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          const profileRes = await axios.get('/api/auth/profile');
          setUser(profileRes.data);
          setToken(access_token);
          return true;
      } catch (error) {
          console.error("Switch failed", error);
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
    const res = await axios.post('/api/auth/change-password', { currentPassword, newPassword });
    const { access_token } = res.data;
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    await refreshProfile();
    return true;
  };

  const value = {
    user,
    token,
    login,
    logout,
    switchParking,
    changePassword,
    refreshProfile,
    loading,
    isAuth: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);