import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../../contexts/PreferencesContext';
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const UserPreferences = () => {
  const { preferences, loading, error, updatePreferences } = usePreferences();
  useNavigate();
  const [localPreferences, setLocalPreferences] = useState({
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
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        ui: preferences.ui || { theme: 'light', language: 'en' },
        dashboard: preferences.dashboard || { autoRefresh: true, refreshInterval: 30 }
      });
    }
  }, [preferences]);

  const handleUIChange = (field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        [field]: value
      }
    }));
  };

  const handleDashboardChange = (field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setLocalError('');
      setSuccess('');
      
      const result = await updatePreferences(localPreferences);
      if (result.success) {
        setSuccess('Preferences saved successfully! Theme changes applied immediately.');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setLocalError(result.error || 'Failed to save preferences');
      }
    } catch (err) {
      setLocalError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const getRefreshIntervalLabel = (value) => {
    switch (value) {
      case 15: return '15 seconds';
      case 30: return '30 seconds';
      case 60: return '1 minute';
      case 300: return '5 minutes';
      case 600: return '10 minutes';
      default: return `${value} seconds`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {(error || localError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error || localError}</p>
            </div>
          </div>
        </div>
      )}

      {/* UI Preferences */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
          User Interface
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <select
              value={localPreferences.ui.theme}
              onChange={(e) => handleUIChange('theme', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dashboard Preferences */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <ArrowPathIcon className="w-5 h-5 mr-2 text-blue-500" />
          Dashboard Settings
        </h3>
        <div className="space-y-6">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowPathIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto Refresh</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Automatically refresh dashboard data</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPreferences.dashboard.autoRefresh}
                onChange={(e) => handleDashboardChange('autoRefresh', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Refresh Interval */}
          <div className={`transition-all duration-300 ${!localPreferences.dashboard.autoRefresh ? 'opacity-50' : 'opacity-100'}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <ClockIcon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
              Refresh Interval
            </label>
            <div className="relative">
              <select
                value={localPreferences.dashboard.refreshInterval}
                onChange={(e) => handleDashboardChange('refreshInterval', parseInt(e.target.value))}
                className={`w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer ${
                  !localPreferences.dashboard.autoRefresh ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-600' : ''
                }`}
                disabled={!localPreferences.dashboard.autoRefresh}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Currently set to: <span className="font-medium text-gray-700 dark:text-gray-300">{getRefreshIntervalLabel(localPreferences.dashboard.refreshInterval)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium shadow-sm"
        >
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </div>
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  );
};

export default UserPreferences;
