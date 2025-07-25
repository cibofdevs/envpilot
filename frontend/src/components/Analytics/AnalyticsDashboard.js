import React, { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../../services/api';
import OverviewCards from './OverviewCards';
import TrendsChart from './TrendsChart';
import DeploymentAnalytics from './DeploymentAnalytics';
import EnvironmentMetrics from './EnvironmentMetrics';
import PerformanceMetrics from './PerformanceMetrics';
import { ChartBarIcon, ArrowTrendingUpIcon, RocketLaunchIcon, GlobeAltIcon, BoltIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState(30); // days
  
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    trends: null,
    deployments: null,
    environments: null,
    performance: null
  });

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      
      const [overview, trends, deployments, environments, performance] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getTrends(dateRange),
        analyticsAPI.getDeploymentAnalytics(dateRange),
        analyticsAPI.getEnvironmentMetrics(dateRange),
        analyticsAPI.getPerformanceMetrics(dateRange)
      ]);

      setAnalyticsData({
        overview: overview.data,
        trends: trends.data,
        deployments: deployments.data,
        environments: environments.data,
        performance: performance.data
      });
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    const loadData = async () => {
      await loadAnalyticsData();
    };
    void loadData();
  }, [dateRange, loadAnalyticsData]);

  const handleExportData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - dateRange);
      
      const response = await analyticsAPI.exportData(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      // Create and download file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data. Please try again.');
    }
  };

  const handleRefresh = async () => {
    await loadAnalyticsData();
  };

  const handleRetry = async () => {
    await loadAnalyticsData();
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'trends', name: 'Trends', icon: ArrowTrendingUpIcon },
    { id: 'deployments', name: 'Deployments', icon: RocketLaunchIcon },
    { id: 'environments', name: 'Environments', icon: GlobeAltIcon },
    { id: 'performance', name: 'Performance', icon: BoltIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive insights into your projects and deployments</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              
              {/* Export Button */}
              <button
                onClick={handleExportData}
                className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2 text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm"
              >
                <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 sm:space-y-8">
          {activeTab === 'overview' && (
            <OverviewCards data={analyticsData.overview} />
          )}
          
          {activeTab === 'trends' && (
            <TrendsChart data={analyticsData.trends} dateRange={dateRange} />
          )}
          
          {activeTab === 'deployments' && (
            <DeploymentAnalytics data={analyticsData.deployments} />
          )}
          
          {activeTab === 'environments' && (
            <EnvironmentMetrics data={analyticsData.environments} />
          )}
          
          {activeTab === 'performance' && (
            <PerformanceMetrics data={analyticsData.performance} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
