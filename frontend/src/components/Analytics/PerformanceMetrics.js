import React from 'react';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, BoltIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const PerformanceMetrics = ({ data }) => {
  if (!data) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const renderMetricCard = (title, value, subtitle, icon, color = 'blue', unit = '') => {
    // Handle different data types and provide fallbacks
    let displayValue = value;
    if (value === null || value === undefined) {
      displayValue = 0;
    }
    
    // Format the value appropriately
    if (typeof displayValue === 'number') {
      displayValue = displayValue.toFixed(1);
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {displayValue}{unit}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  const renderBarChart = (data, title, color = 'blue', unit = '') => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No data available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No {title.toLowerCase()} data to display</p>
        </div>
      );
    }

    const maxValue = Math.max(...Object.values(data));
    const sortedData = Object.entries(data).sort(([,a], [,b]) => b - a);

    return (
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{title}</h4>
        <div className="space-y-3">
          {sortedData.map(([name, value]) => (
            <div key={name} className="flex items-center space-x-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {value}{unit}
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`bg-${color}-500 h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Extract data with fallbacks
  const {
    averageDeploymentTime = 0,
    systemUptime = 0,
    errorRate = 0,
    averageResponseTime = 0,
    deploymentTimesByProject = {},
    responseTimesByEnvironment = {},
    systemHealth = {},
    recentIssues = []
  } = data;

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Avg. Deploy Time',
          averageDeploymentTime,
          'Minutes per deployment',
          <ClockIcon className="h-6 w-6" />, 
          'blue',
          'm'
        )}
        {renderMetricCard(
          'System Uptime',
          systemUptime,
          'Percentage availability',
          <CheckCircleIcon className="h-6 w-6" />, 
          'green',
          '%'
        )}
        {renderMetricCard(
          'Error Rate',
          errorRate,
          'Failed operations',
          <ExclamationTriangleIcon className="h-6 w-6" />, 
          'red',
          '%'
        )}
        {renderMetricCard(
          'Response Time',
          averageResponseTime,
          'Milliseconds average',
          <BoltIcon className="h-6 w-6" />, 
          'yellow',
          'ms'
        )}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment Performance by Project */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {renderBarChart(
            deploymentTimesByProject, 
            'Deployment Times by Project', 
            'blue', 
            'm'
          )}
        </div>

        {/* Environment Response Times */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {renderBarChart(
            responseTimesByEnvironment, 
            'Response Times by Environment', 
            'yellow', 
            'ms'
          )}
        </div>
      </div>

      {/* System Health Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">System Health Overview</h4>
        {systemHealth && Object.keys(systemHealth).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(systemHealth).map(([component, health]) => (
              <div key={component} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {component.replace('_', ' ')}
                  </h5>
                  <div className={`w-3 h-3 rounded-full ${
                    health.status === 'healthy' ? 'bg-green-500' :
                    health.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`font-medium capitalize ${
                      health.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                      health.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {health.status || 'unknown'}
                    </span>
                  </div>
                  {health.responseTime && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Response:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {health.responseTime}ms
                      </span>
                    </div>
                  )}
                  {health.uptime && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Uptime:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {health.uptime}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No health data</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">System health metrics will appear here</p>
          </div>
        )}
      </div>

      {/* Recent Performance Issues */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Performance Issues</h4>
        {recentIssues && recentIssues.length > 0 ? (
          <div className="space-y-4">
            {recentIssues.slice(0, 10).map((issue, index) => (
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
                        {issue.title || 'Performance Issue'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {issue.component || 'Unknown component'} • 
                        {issue.environment || 'Unknown environment'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium capitalize ${
                        issue.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                        issue.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {issue.severity || 'Info'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {issue.timestamp ? 
                          new Date(issue.timestamp).toLocaleString() : 
                          'Unknown time'
                        }
                      </p>
                    </div>
                  </div>
                  {issue.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {issue.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No issues found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">All systems are performing well</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMetrics;
