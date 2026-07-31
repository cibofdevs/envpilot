import React from 'react';
import { GlobeAltIcon, CheckCircleIcon, ChartBarIcon, FlagIcon } from '@heroicons/react/24/outline';

const EnvironmentMetrics = ({ data }) => {
  if (!data) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'deploying': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-primary-500';
    }
  };

  const renderMetricCard = (title, value, subtitle, icon, color = 'primary') => (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderBarChart = (data, title, color = 'primary', unit = '') => {
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
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(name)}`}></div>
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
    totalEnvironments = 0,
    activeEnvironments = 0,
    statusDistribution: environmentStatusDistribution = {},
    environmentsPerProject: environmentsByProject = {},
    environmentHealth = {},
    totalFeatureFlags = 0,
    enabledFeatureFlags = 0
  } = data;

  // Backend doesn't compute a single "average health" figure, so derive one
  // from the per-environment success rates already returned.
  const healthValues = Object.values(environmentHealth).map((h) => h.successRate || 0);
  const averageHealth = healthValues.length > 0
    ? Math.round((healthValues.reduce((sum, v) => sum + v, 0) / healthValues.length) * 100) / 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Total Environments',
          totalEnvironments,
          'All environments',
          <GlobeAltIcon className="h-6 w-6" />,
          'primary'
        )}
        {renderMetricCard(
          'Active Environments',
          activeEnvironments,
          'Currently online',
          <CheckCircleIcon className="h-6 w-6" />,
          'green'
        )}
        {renderMetricCard(
          'Health Score',
          `${averageHealth}%`,
          'Average health',
          <ChartBarIcon className="h-6 w-6" />,
          'purple'
        )}
        {renderMetricCard(
          'Feature Flags',
          totalFeatureFlags,
          `${enabledFeatureFlags} enabled`,
          <FlagIcon className="h-6 w-6" />,
          'yellow'
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Status Distribution */}
        <div className="card p-4 sm:p-6">
          {renderPieChart(environmentStatusDistribution, 'Environment Status Distribution')}
        </div>

        {/* Environments by Project */}
        <div className="card p-4 sm:p-6">
          {renderBarChart(environmentsByProject, 'Environments by Project', 'green')}
        </div>
      </div>

      {/* Environment Health Overview */}
      <div className="card p-4 sm:p-6">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Environment Health Overview</h4>
        {Object.keys(environmentHealth).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(environmentHealth).map(([envName, health]) => (
              <div key={envName} className="p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base" title={envName}>
                    {envName}
                  </h5>
                  <div className={`w-3 h-3 rounded-full ${
                    health.successRate >= 90 ? 'bg-green-500' :
                    health.successRate >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{health.successRate || 0}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Deployments (30d):</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{health.totalDeployments || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Last Deployment:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {health.lastDeployment ? new Date(health.lastDeployment).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No health data</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Environment health metrics will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentMetrics;
