import React from 'react';
import { UsersIcon, CheckCircleIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const UserStats = ({ stats, roles }) => {
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'text-red-600 dark:text-red-400';
      case 'developer': return 'text-blue-600 dark:text-blue-400';
      case 'user': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-7 w-7 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.totalUsers || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-500 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-7 w-7 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.activeUsers || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <SparklesIcon className="h-7 w-7 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">New Users</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.recentRegistrations || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-yellow-500 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-7 w-7 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Activity</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.averageActivityScore || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">User engagement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Distribution */}
      {stats.roleDistribution && Object.keys(stats.roleDistribution).length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Role Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.roleDistribution).map(([role, count]) => (
              <div key={role} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {role.replace('_', ' ')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {count}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    role === 'ADMIN' ? 'bg-red-500' :
                    role === 'DEVELOPER' ? 'bg-blue-500' :
                    'bg-green-500'
                  }`}></div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        role === 'ADMIN' ? 'bg-red-500' :
                        role === 'DEVELOPER' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.totalUsers > 0 ? ((count / stats.totalUsers) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Activity Trends */}
      {stats.activityTrends && Object.keys(stats.activityTrends).length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">User Activity Trends</h3>
          <div className="space-y-4">
            {Object.entries(stats.activityTrends).map(([period, data]) => (
              <div key={period} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {period.replace('_', ' ')}
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {data.totalUsers} users
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Active:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {data.activeUsers} ({data.activePercentage || 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">New:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {data.newUsers}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Avg. Sessions:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {data.averageSessions || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Active Users */}
      {stats.topActiveUsers && stats.topActiveUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Active Users</h3>
          <div className="space-y-3">
            {stats.topActiveUsers.slice(0, 10).map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.name || 'Unknown User'}
                    </p>
                    <p className={`text-xs ${getRoleColor(user.role)}`}>
                      {user.role || 'User'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.activityScore || 0}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.lastActivity ? 
                      new Date(user.lastActivity).toLocaleDateString() : 
                      'Never'
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

export default UserStats;
