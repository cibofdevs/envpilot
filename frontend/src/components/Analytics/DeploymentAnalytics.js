import React from 'react';
import { RocketLaunchIcon, CheckCircleIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const DeploymentAnalytics = ({ data }) => {
  if (!data) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const renderMetricCard = (title, value, subtitle, icon, color = 'primary') => (
    <div className="card p-6">
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

  const renderBarChart = (data, title, color = 'primary') => {
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
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
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
                    name === 'success' ? 'bg-green-500' :
                    name === 'failed' ? 'bg-red-500' :
                    name === 'pending' || name === 'in_progress' ? 'bg-yellow-500' :
                    'bg-primary-500'
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
    deploymentSuccessRate: successRate = 0,
    failureRate = 0,
    averageDeploymentsPerDay = 0,
    deploymentsByEnvironment = {},
    deploymentStatusDistribution: deploymentsByStatus = {}
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
          'primary'
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
        <div className="card p-6">
          {renderBarChart(deploymentsByEnvironment, 'Deployments by Environment', 'green')}
        </div>

        {/* Deployments by Status */}
        <div className="card p-6">
          {renderPieChart(deploymentsByStatus, 'Deployments by Status')}
        </div>
      </div>
    </div>
  );
};

export default DeploymentAnalytics;
