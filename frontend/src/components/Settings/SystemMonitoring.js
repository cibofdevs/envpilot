import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import { 
  ServerIcon, 
  CpuChipIcon, 
  CircleStackIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const SystemMonitoring = () => {
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadMonitoringData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSystemMonitoring();
      setMonitoringData(response.data);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError('Failed to load system monitoring data');
      console.error('Error loading monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CircleStackIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (loading && !monitoringData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !monitoringData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            System Monitoring
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system health and performance data
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon className="h-4 w-4 mr-1" />
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={loadMonitoringData}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {monitoringData && (
        <>
          {/* System Health */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              System Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {monitoringData.health && Object.entries(monitoringData.health).map(([component, health]) => (
                <div key={component} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">
                    {getStatusIcon(health.status)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {component}
                    </h4>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>Status: <span className="font-medium capitalize">{health.status}</span></p>
                      {health.responseTime && (
                        <p>Response Time: <span className="font-medium">{health.responseTime}</span></p>
                      )}
                      {health.memoryUsage && (
                        <p>Memory Usage: <span className="font-medium">{health.memoryUsage}</span></p>
                      )}
                      {health.lastCheck && (
                        <p>Last Check: <span className="font-medium">
                          {new Date(health.lastCheck).toLocaleString()}
                        </span></p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Usage */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Resource Usage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {monitoringData.resources && Object.entries(monitoringData.resources).map(([resource, data]) => (
                <div key={resource} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    {resource === 'cpu' ? (
                      <CpuChipIcon className="h-6 w-6 text-blue-500" />
                    ) : (
                      <ServerIcon className="h-6 w-6 text-green-500" />
                    )}
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {resource === 'cpu' ? 'CPU' : 'Memory'}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {data.usage && (
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Usage</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{data.usage}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${parseFloat(data.usage)}%`,
                              backgroundColor: parseFloat(data.usage) > 80 ? '#ef4444' : 
                                              parseFloat(data.usage) > 60 ? '#f59e0b' : '#3b82f6'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {data.loadAverage && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Load Average: <span className="font-medium">{data.loadAverage}</span>
                      </p>
                    )}
                    {data.processors && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Processors: <span className="font-medium">{data.processors}</span>
                      </p>
                    )}
                    {data.used && data.total && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Used: <span className="font-medium">{data.used}</span> / {data.total}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Issues */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              System Issues
            </h3>
            {monitoringData.issues && monitoringData.issues.length > 0 ? (
              <div className="space-y-4">
                {monitoringData.issues.map((issue, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      issue.severity === 'critical' ? 'bg-red-500' :
                      issue.severity === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {issue.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {issue.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium capitalize px-2 py-1 rounded-full ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {issue.timestamp ? 
                              new Date(issue.timestamp).toLocaleString() : 
                              'Unknown time'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No system issues
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  All systems are running smoothly
                </p>
              </div>
            )}
          </div>

          {/* Timestamp */}
          {monitoringData.timestamp && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Last data update: {new Date(monitoringData.timestamp).toLocaleString()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SystemMonitoring; 