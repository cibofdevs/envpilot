import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { config } from '../config/config';

const PreferencesContext = createContext();

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const { theme, setThemeMode } = useTheme();
  const [preferences, setPreferences] = useState({
    ui: {
      theme: 'light',
      language: 'en'
    },
    dashboard: {
      // Hapus defaultView
      autoRefresh: true,
      refreshInterval: 30
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mixedContentError, setMixedContentError] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  // Sync theme from preferences with useTheme hook
  useEffect(() => {
    if (preferences.ui?.theme && preferences.ui.theme !== theme) {
      setThemeMode(preferences.ui.theme);
    }
  }, [preferences.ui?.theme, theme, setThemeMode]);

  const loadPreferences = async () => {
    // Check if we're in a Mixed Content situation (HTTPS frontend, HTTP backend)
    const isMixedContent = window.location.protocol === 'https:' && config.API_BASE_URL.startsWith('http://');
    
    if (isMixedContent) {
      console.warn('Preferences loading disabled due to Mixed Content: HTTPS frontend cannot connect to HTTP backend');
      setMixedContentError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await settingsAPI.getUserPreferences();
      setPreferences(response.data);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      setError('');
      await settingsAPI.updateUserPreferences(newPreferences);
      setPreferences(newPreferences);
      
      // Apply theme change immediately if theme was updated
      if (newPreferences.ui?.theme && newPreferences.ui.theme !== preferences.ui?.theme) {
        setThemeMode(newPreferences.ui.theme);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setError('Failed to update preferences');
      return { success: false, error: err.message };
    }
  };

  const updateTheme = async (newTheme) => {
    const newPreferences = {
      ...preferences,
      ui: {
        ...preferences.ui,
        theme: newTheme
      }
    };
    
    // Apply theme change immediately
    setThemeMode(newTheme);
    
    return await updatePreferences(newPreferences);
  };

  const updateDashboardPreferences = async (field, value) => {
    const newPreferences = {
      ...preferences,
      dashboard: {
        ...preferences.dashboard,
        [field]: value
      }
    };
    return await updatePreferences(newPreferences);
  };

  const getDashboardPreference = (field) => {
    return preferences.dashboard?.[field];
  };

  const getUIPreference = (field) => {
    return preferences.ui?.[field];
  };

  const value = {
    preferences,
    loading,
    error,
    mixedContentError,
    updatePreferences,
    updateTheme,
    updateDashboardPreferences,
    getDashboardPreference,
    getUIPreference,
    loadPreferences
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}; 