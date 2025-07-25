import React from 'react';
import { RocketLaunchIcon, CheckCircleIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const DeploymentAnalytics = ({ data }) => {
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

  const renderMetricCard = (title, value, subtitle, icon, color = 'blue') => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
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

  const renderBarChart = (data, title, color = 'blue') => {
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
                    {value}
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

  const renderPieChart = (data, title) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No data available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No {title.toLowerCase()} data to display</p>
        </div>
      );
    }

    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    const sortedData = Object.entries(data).sort(([,a], [,b]) => b - a);

    return (
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{title}</h4>
        <div className="space-y-3">
          {sortedData.map(([name, value]) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    name === 'successful' ? 'bg-green-500' :
                    name === 'failed' ? 'bg-red-500' :
                    name === 'pending' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></div>
                  <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                    {name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {percentage}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Extract data with fallbacks
  const {
    totalDeployments = 0,
    successfulDeployments = 0,
    failedDeployments = 0,
    successRate = 0,
    failureRate = 0,
    averageDeploymentsPerDay = 0,
    deploymentsByEnvironment = {},
    deploymentsByStatus = {},
    recentDeployments = []
  } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Total Deployments',
          totalDeployments,
          'All time',
          <RocketLaunchIcon className="h-6 w-6" />, 
          'blue'
        )}
        {renderMetricCard(
          'Success Rate',
          `${successRate}%`,
          `${successfulDeployments} successful`,
          <CheckCircleIcon className="h-6 w-6" />, 
          'green'
        )}
        {renderMetricCard(
          'Failed Deployments',
          failedDeployments,
          `${failureRate}% failure rate`,
          <XCircleIcon className="h-6 w-6" />, 
          'red'
        )}
        {renderMetricCard(
          'Avg. per Day',
          averageDeploymentsPerDay,
          'Recent period',
          <ChartBarIcon className="h-6 w-6" />, 
          'purple'
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployments by Environment */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {renderBarChart(deploymentsByEnvironment, 'Deployments by Environment', 'green')}
        </div>

        {/* Deployments by Status */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {renderPieChart(deploymentsByStatus, 'Deployments by Status')}
        </div>
      </div>

      {/* Recent Deployments */}
      {recentDeployments && recentDeployments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Deployments</h4>
          <div className="space-y-3">
            {recentDeployments.slice(0, 10).map((deployment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    deployment.status === 'SUCCESS' ? 'bg-green-500' :
                    deployment.status === 'FAILED' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {deployment.projectName || 'Unknown Project'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deployment.environment?.name || 'Unknown Environment'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium capitalize ${
                    deployment.status === 'SUCCESS' ? 'text-green-600 dark:text-green-400' :
                    deployment.status === 'FAILED' ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {deployment.status?.toLowerCase() || 'unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {deployment.timestamp ? 
                      new Date(deployment.timestamp).toLocaleString() : 
                      'Unknown time'
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentAnalytics;
