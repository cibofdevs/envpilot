import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const SystemInfo = () => {
  const { appName, appVersion } = useApp();
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSystemInfo();
      setSystemInfo(response.data);
    } catch (err) {
      setError('Failed to load system information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">System Information</h3>
        
        {systemInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Application Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Application</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{appName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Version</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{appVersion}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Environment</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.application?.environment}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Build Date</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.application?.buildDate}</dd>
                </div>
              </dl>
            </div>

            {/* System Stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Statistics</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Total Users</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.system?.totalUsers}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Uptime</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.system?.uptime}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Memory Usage</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.system?.memoryUsage}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Disk Usage</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.system?.diskUsage}</dd>
                </div>
              </dl>
            </div>

            {/* Database Info */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Database</h4>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Type</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.database?.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Version</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.database?.version}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{systemInfo.database?.status}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadSystemInfo}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Refresh System Info
        </button>
      </div>
    </div>
  );
};

export default SystemInfo;
