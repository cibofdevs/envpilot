import React from 'react';
import { FolderIcon, GlobeAltIcon, RocketLaunchIcon, UsersIcon, FlagIcon, Cog6ToothIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const OverviewCards = ({ data }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Projects',
      value: data.totalProjects,
      change: data.newProjectsLast30Days,
      changeLabel: 'new this month',
      icon: FolderIcon,
      color: 'blue'
    },
    {
      title: 'Total Environments',
      value: data.totalEnvironments,
      change: data.activeEnvironments,
      changeLabel: 'active',
      icon: GlobeAltIcon,
      color: 'green'
    },
    {
      title: 'Total Deployments',
      value: data.totalDeployments,
      change: data.newDeploymentsLast30Days,
      changeLabel: 'this month',
      icon: RocketLaunchIcon,
      color: 'purple'
    },
    {
      title: 'Total Users',
      value: data.totalUsers,
      change: data.activeUsers,
      changeLabel: 'active',
      icon: UsersIcon,
      color: 'indigo'
    },
    {
      title: 'Feature Flags',
      value: data.totalFeatureFlags,
      change: data.enabledFeatureFlags,
      changeLabel: 'enabled',
      icon: FlagIcon,
      color: 'yellow'
    },
    {
      title: 'Configurations',
      value: data.totalConfigurations,
      change: data.recentConfigurations,
      changeLabel: 'recent',
      icon: Cog6ToothIcon,
      color: 'gray'
    },
    {
      title: 'Success Rate',
      value: `${data.deploymentSuccessRate || 0}%`,
      change: data.successfulDeployments,
      changeLabel: 'successful',
      icon: CheckCircleIcon,
      color: 'green'
    },
    {
      title: 'Failed Deployments',
      value: data.failedDeployments || 0,
      change: data.failureRate ? `${data.failureRate}%` : '0%',
      changeLabel: 'failure rate',
      icon: XCircleIcon,
      color: 'red'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700',
      gray: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700'
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
              {card.change !== undefined && (
                <div className="mt-2 flex items-center text-xs sm:text-sm">
                  <span className="text-gray-500 dark:text-gray-400 truncate">
                    {card.change} {card.changeLabel}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${getColorClasses(card.color)}`}>
              <card.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OverviewCards;
