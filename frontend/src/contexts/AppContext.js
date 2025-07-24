import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [appName, setAppName] = useState('Multi-Project Environment Manager');
  const [appVersion, setAppVersion] = useState('v1.0.0');
  const [loading, setLoading] = useState(true);

  const loadAppSettings = async () => {
    try {
      // Try to get app info from the new endpoint that's accessible by all users
      const response = await settingsAPI.getAppInfo();
      const appInfo = response.data;
      if (appInfo.appName) {
        setAppName(appInfo.appName);
      }
      if (appInfo.appVersion) {
        setAppVersion(appInfo.appVersion);
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
      // Keep default values if failed to load
    } finally {
      setLoading(false);
    }
  };

  const updateAppName = (newAppName) => {
    setAppName(newAppName);
  };

  const updateAppVersion = (newAppVersion) => {
    setAppVersion(newAppVersion);
  };

  useEffect(() => {
    loadAppSettings();
  }, []);

  const value = {
    appName,
    appVersion,
    updateAppName,
    updateAppVersion,
    loading,
    reloadAppSettings: loadAppSettings
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}; 