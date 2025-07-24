import React from 'react';
import { Link } from 'react-router-dom';
import { FolderIcon } from '@heroicons/react/24/outline';
import StatusBadge from '../Common/StatusBadge';

const getStatusBadge = (status) => {
  return <StatusBadge status={status} size="sm" />;
};

export default function RecentProjects({ projects, isAdmin = false, userRole }) {
  const getEmptyStateMessage = () => {
    if (isAdmin) {
      return {
        title: "No projects",
        description: "Get started by creating a new project.",
        showButton: true
      };
    } else if (userRole === 'DEVELOPER' || userRole === 'QA') {
      return {
        title: "No accessible projects",
        description: "You haven't been assigned to any projects yet. Please contact your administrator to get access.",
        showButton: true
      };
    } else {
      return {
        title: "No projects",
        description: "You have not been assigned to any projects yet.",
        showButton: true
      };
    }
  };

  const emptyState = getEmptyStateMessage();

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Projects</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {projects.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{emptyState.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {emptyState.description}
            </p>
            {emptyState.showButton && (
              <div className="mt-6">
                <Link
                  to="/projects"
                  className="btn-primary"
                >
                  View Projects
                </Link>
              </div>
            )}
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {project.name}
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {project.description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Owner: {project.owner?.name}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {getStatusBadge(project.status)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {projects.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/projects"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
          >
            View all projects →
          </Link>
        </div>
      )}
    </div>
  );
}
