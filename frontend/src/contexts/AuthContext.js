import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tempToken = localStorage.getItem('tempToken');
    
    console.log('AuthContext useEffect - token:', !!token, 'userData:', !!userData, 'tempToken:', !!tempToken);
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setToken(token);
        
        // Check if token is expired by decoding it
        const isExpired = checkTokenExpiration(token);
        if (isExpired) {
          console.log('Token expired, redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      }
    }
    
    // Check for temp token and set MFA state accordingly
    if (tempToken) {
      console.log('Found temp token, checking MFA state...');
      // Don't set MFA state here, let the login flow handle it
    }
    
    setLoading(false);
  }, []);

  // Function to check if JWT token is expired
  const checkTokenExpiration = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired if we can't decode
    }
  };

  const getFriendlyErrorMessage = (error) => {
    // Handle specific error messages from backend first
    const backendMessage = error.response?.data?.message;
    if (backendMessage) {
      return backendMessage;
    }
    
    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      return 'Invalid email or password. Please check your credentials.';
    }
    if (error.response?.status === 403) {
      return 'Access denied. Please contact administrator.';
    }
    if (error.response?.status === 404) {
      return 'Email not found. Please check your email address.';
    }
    if (error.response?.status === 422) {
      return 'Invalid data. Please check your email and password.';
    }
    if (error.response?.status === 500) {
      return 'Server error occurred. Please try again in a few moments.';
    }
    if (error.response?.status === 503) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return 'Cannot connect to server. Please check your internet connection.';
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Connection timeout. Please try again.';
    }
    
    // Default error message
    return 'An error occurred during login. Please try again.';
  };

  const login = async (credentials) => {
    try {
      // Check if user is already logged in
      const existingToken = localStorage.getItem('token');
      const existingUser = localStorage.getItem('user');
      
      if (existingToken && existingUser) {
        // Set user state if not already set
        if (!user) {
          try {
            const parsedUser = JSON.parse(existingUser);
            setUser(parsedUser);
          } catch (error) {
            console.error('Error parsing existing user data:', error);
          }
        }
        return { success: true };
      }
      
      const response = await authAPI.login(credentials);
      
      // Check if MFA is required
      if (response.data.requiresMfa) {
        setMfaRequired(true);
        setTempToken(response.data.tempToken);
        localStorage.setItem('tempToken', response.data.tempToken);
        localStorage.setItem('tempEmail', credentials.email);
        return { 
          success: false, 
          requiresMfa: true,
          tempToken: response.data.tempToken
        };
      }
      
      // Check if MFA setup is required
      if (response.data.requiresMfaSetup) {
        setMfaSetupRequired(true);
        setTempToken(response.data.tempToken);
        localStorage.setItem('tempToken', response.data.tempToken);
        localStorage.setItem('tempEmail', credentials.email);
        return { 
          success: false, 
          requiresMfaSetup: true,
          tempToken: response.data.tempToken
        };
      }
      
      const { token, type, ...userData } = response.data;
      
      if (!token) {
        console.error('No token received from server');
        return { 
          success: false, 
          error: 'No authentication token received from server.' 
        };
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setToken(token);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      return { 
        success: false, 
        error: getFriendlyErrorMessage(error)
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await authAPI.logout();
    } catch (error) {
      // Even if backend call fails, we still want to clear local storage
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local storage and user state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      
      // Redirect to login page
      if (window.location.pathname !== '/login') {
      window.location.href = '/login';
      }
    }
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isDeveloper = () => user?.role === 'DEVELOPER';

  // Function to check if user has required role for deployment
  const canDeploy = () => {
    return isAdmin() || isDeveloper();
  };

  // Function to check if user can deploy to specific environment
  const canDeployToEnvironment = (environmentName) => {
    if (!user) return false;
    
    const envName = environmentName?.toLowerCase();
    
    // Admin can deploy to all environments
    if (isAdmin()) return true;
    
    // Developer can only deploy to development
    if (isDeveloper()) {
      return envName === 'development';
    }
    
    return false;
  };

  // Function to update user data (e.g., after profile photo upload)
  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  const completeMfaLogin = (userData) => {
    console.log('Completing MFA login with user data:', userData);
    
    // Extract token and user data
    const { token, ...userInfo } = userData;
    
    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userInfo));
    
    // Update state
    setUser(userInfo);
    setToken(token);
    setMfaRequired(false);
    setMfaSetupRequired(false);
    setTempToken(null);
    
    // Clean up temp data
    localStorage.removeItem('tempToken');
    localStorage.removeItem('tempEmail');
    
    console.log('MFA login completed, user set:', userInfo);
  };

  const completeMfaSetup = (userData) => {
    console.log('Completing MFA setup with user data:', userData);
    
    // Extract token and user data
    const { token, ...userInfo } = userData;
    
    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userInfo));
    
    // Update state
    setUser(userInfo);
    setToken(token);
    setMfaSetupRequired(false);
    setTempToken(null);
    
    // Clean up temp data
    localStorage.removeItem('tempToken');
    localStorage.removeItem('tempEmail');
    
    console.log('MFA setup completed, user set:', userInfo);
  };

  const resetMfaState = () => {
    setMfaRequired(false);
    setMfaSetupRequired(false);
    setTempToken(null);
    localStorage.removeItem('tempToken');
    localStorage.removeItem('tempEmail');
  };

  const value = {
    user,
    loading,
    mfaRequired,
    mfaSetupRequired,
    tempToken,
    token,
    isAuthenticated: !!(user && token),
    login,
    logout,
    isAdmin,
    isDeveloper,
    canDeploy,
    canDeployToEnvironment,
    updateUser,
    completeMfaLogin,
    completeMfaSetup,
    resetMfaState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};