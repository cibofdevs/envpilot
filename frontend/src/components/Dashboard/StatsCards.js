import React from 'react';
import {
  FolderIcon,
  ServerIcon,
  UsersIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

export default function StatsCards({ stats, userRole }) {
  const cards = [
    {
      name: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderIcon,
      color: 'from-primary-500 to-primary-600',
    },
    {
      name: 'Total Environments',
      value: stats.totalEnvironments,
      icon: ServerIcon,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: UsersIcon,
      color: 'from-accent-500 to-accent-600',
    },
    {
      name: 'Total Deployments',
      value: stats.totalDeployments,
      icon: RocketLaunchIcon,
      color: 'from-orange-500 to-amber-500',
    },
  ];

  // Only show stats cards for admin users
  if (userRole !== 'ADMIN') {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card) => (
        <div key={card.name} className="card p-4 sm:p-6 hover:shadow-lg dark:hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-2 sm:p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
              <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{card.name}</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
