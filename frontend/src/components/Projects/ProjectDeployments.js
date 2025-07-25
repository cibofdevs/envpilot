import React, { useState, useEffect, useCallback } from 'react';
import { projectsAPI, jenkinsAPI } from '../../services/api';
import notificationService from '../../services/notificationService';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PauseCircleIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import DeploymentStatusBadge from '../Common/DeploymentStatusBadge';

const ProjectDeployments = ({ projectId }) => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  const loadDeployments = useCallback(async () => {
    if (!projectId) {
      setError('Project ID not found.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await projectsAPI.getProjectDeployments(projectId);
      setDeployments(response.data);
    } catch (err) {
      setError('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadDeployments();
    }
  }, [projectId, loadDeployments]);

  const handleRefresh = async () => {
    if (!projectId) return;
    try {
      setRefreshing(true);
      const response = await projectsAPI.getProjectDeployments(projectId);
      setDeployments(response.data);
      // Show success notification
      notificationService.showSystemAlert(
        'Deployment History Updated',
        'Deployment history has been refreshed successfully',
        'success'
      );
    } catch (err) {
      setError('Failed to refresh deployments');
      notificationService.showSystemAlert(
        'Refresh Failed',
        'Failed to refresh deployment history',
        'error'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Real-time monitoring of deployment status changes
  useEffect(() => {
    const checkDeploymentStatus = async () => {
      if (!projectId) return;
      try {
        // First, sync all active deployments from Jenkins
        await jenkinsAPI.syncAllDeployments();
        
        // Then fetch updated deployment list
        const response = await projectsAPI.getProjectDeployments(projectId);
        const newDeployments = response.data;
        
        // Check for status changes and show notifications
        newDeployments.forEach(newDeployment => {
          const oldDeployment = deployments.find(d => d.id === newDeployment.id);
          if (oldDeployment && oldDeployment.status !== newDeployment.status) {
            // Status changed - show notification
            if (newDeployment.status === 'SUCCESS') {
              // Show browser notification
              notificationService.showDeploymentNotification(newDeployment);
              
              // Show success toast
              notificationService.showSystemAlert(
                '🚀 Deployment Successful!',
                `Deployment of project '${newDeployment.project.name}' to ${newDeployment.environment.name} with version ${newDeployment.version} has been successfully completed in Jenkins`,
                'success'
              );
            } else if (newDeployment.status === 'FAILED') {
              // Show browser notification
              notificationService.showSystemAlert(
                '❌ Deployment Failed',
                `Deployment of project '${newDeployment.project.name}' to ${newDeployment.environment.name} with version ${newDeployment.version} failed in Jenkins`,
                'error'
              );
            } else if (newDeployment.status === 'IN_PROGRESS') {
              // Show in progress notification
              notificationService.showSystemAlert(
                '⏳ Deployment In Progress',
                `Deployment of project '${newDeployment.project.name}' to ${newDeployment.environment.name} with version ${newDeployment.version} is being processed in Jenkins`,
                'info'
              );
            }
          }
        });
        
        setDeployments(newDeployments);
      } catch (err) {
        console.error('Failed to check deployment status:', err);
      }
    };

    // Check every 3 seconds if there are active deployments (more frequent for real-time feel)
    const hasActiveDeployments = deployments.some(d => 
      d.status === 'PENDING' || d.status === 'IN_PROGRESS'
    );

    if (hasActiveDeployments) {
      const interval = setInterval(checkDeploymentStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [deployments, projectId]);

  // Pagination logic
  const totalPages = Math.ceil(deployments.length / pageSize);
  const paginatedDeployments = deployments.slice((page - 1) * pageSize, page * pageSize);

      // Helper to create page number array
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    return <DeploymentStatusBadge status={status} size="sm" />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'PENDING':
        return <PauseCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />;
      default:
        return <QuestionMarkCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Deployment History</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          title="Refresh deployment history"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {deployments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No deployments found for this project.</p>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {paginatedDeployments.map((deployment) => (
            <div
              key={deployment.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(deployment.status)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Version {deployment.version}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Environment: {deployment.environment.name}
                    </p>
                    {deployment.jenkinsBuildNumber && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Build #{deployment.jenkinsBuildNumber}
                      </p>
                    )}
                    {deployment.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Notes: {deployment.notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {getStatusBadge(deployment.status)}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(deployment.createdAt).toLocaleString()}
                  </p>
                  {deployment.completedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Completed: {new Date(deployment.completedAt).toLocaleString()}
                    </p>
                  )}
                  {deployment.completedAt && deployment.createdAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Duration: {Math.round((new Date(deployment.completedAt) - new Date(deployment.createdAt)) / 1000 / 60)}m
                    </p>
                  )}
                </div>
              </div>
              
              {deployment.triggeredBy && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Triggered by: {deployment.triggeredBy.name}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Pagination Controls with numbers */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
         {getPageNumbers().map((num) => (
           <button
             key={num}
             onClick={() => setPage(num)}
             className={`px-3 py-1 rounded font-medium ${
               num === page 
                 ? 'bg-primary-600 text-white' 
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900'
             }`}
           >
             {num}
           </button>
         ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        </>
      )}
    </div>
  );
};

export default ProjectDeployments;
