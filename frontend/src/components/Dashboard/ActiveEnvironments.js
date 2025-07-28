import React, { useState, useEffect } from 'react';
import { ServerIcon } from '@heroicons/react/24/outline';
import EnvironmentStatusBadge from '../Common/EnvironmentStatusBadge';
import Pagination from '../Common/Pagination';

const getStatusBadge = (status) => {
  return <EnvironmentStatusBadge status={status} size="sm" />;
};

// Skeleton loading component
const EnvironmentSkeleton = () => (
  <div className="px-6 py-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mt-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-1"></div>
      </div>
    </div>
  </div>
);

export default function ActiveEnvironments({ environments, userRole }) {
  const [currentPage, setCurrentPage] = useState(() => {
    // Load saved page from localStorage
    const saved = localStorage.getItem('activeEnvironmentsCurrentPage');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem('activeEnvironmentsItemsPerPage');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

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

  // Calculate pagination
  const totalPages = Math.ceil(environments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEnvironments = environments.slice(startIndex, endIndex);

  // Reset to first page when environments change or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [environments.length, itemsPerPage]);

  // Save items per page preference to localStorage
  useEffect(() => {
    localStorage.setItem('activeEnvironmentsItemsPerPage', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Save current page to localStorage
  useEffect(() => {
    localStorage.setItem('activeEnvironmentsCurrentPage', currentPage.toString());
  }, [currentPage]);

  // Keyboard shortcuts for pagination
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (environments.length <= itemsPerPage) return;
      
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        handlePageChange(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        handlePageChange(totalPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, environments.length, itemsPerPage]);

  // Loading progress animation
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 300);
    }
  }, [isLoading]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setIsLoading(true);
    setItemsPerPage(newItemsPerPage);
    // Simulate loading delay
    setTimeout(() => setIsLoading(false), 300);
  };

  const handlePageChange = (newPage) => {
    setIsLoading(true);
    setCurrentPage(newPage);
    // Simulate loading delay
    setTimeout(() => setIsLoading(false), 300);
  };

  const emptyState = getEmptyStateMessage();

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Active Environments</h3>
            {environments.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {environments.length} environment{environments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {environments.length > 3 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">
                Show:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                disabled={isLoading}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Loading progress bar */}
      {isLoading && loadingProgress > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div 
            className="bg-primary-600 h-1 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
      )}
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700 relative">
        {environments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <ServerIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{emptyState.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{emptyState.description}</p>
          </div>
        ) : isLoading ? (
          // Show skeleton loading
          <div className="pagination-enter">
            {Array.from({ length: itemsPerPage }, (_, index) => (
              <EnvironmentSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="pagination-enter">
            {currentEnvironments.map((environment, index) => (
              <div 
                key={environment.id} 
                className="px-6 py-4 transition-all duration-300 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-800 pagination-item-enter"
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
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
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200"
                      >
                        View deployment →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {environments.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={environments.length}
          showInfo={true}
        />
      )}
    </div>
  );
}
