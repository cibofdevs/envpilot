import React from 'react';
import { ServerIcon } from '@heroicons/react/24/outline';
import EnvironmentStatusBadge from '../Common/EnvironmentStatusBadge';

const getStatusBadge = (status) => {
  return <EnvironmentStatusBadge status={status} size="sm" />;
};

export default function ActiveEnvironments({ environments, userRole }) {
  const getEmptyStateMessage = () => {
    if (userRole === 'DEVELOPER' || userRole === 'QA') {
      return {
        title: "No accessible environments",
        description: "You haven't been assigned to any environments yet. Please contact your administrator to get access."
      };
    }
    
    return {
      title: "No active environments",
      description: "Environments will appear here when they're online."
    };
  };

  const emptyState = getEmptyStateMessage();

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Active Environments</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {environments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <ServerIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{emptyState.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{emptyState.description}</p>
          </div>
        ) : (
          environments.map((environment) => (
            <div key={environment.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {environment.name}
                    </p>
                    {getStatusBadge(environment.status)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Project: {environment.project?.name}
                  </p>
                  {environment.version && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Version: {environment.version}
                    </p>
                  )}
                  {environment.deploymentUrl && (
                    <a
                      href={environment.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                    >
                      View deployment →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
