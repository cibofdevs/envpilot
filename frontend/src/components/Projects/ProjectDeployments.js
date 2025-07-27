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
  const [activeDeployments, setActiveDeployments] = useState(new Set());

  const loadDeployments = useCallback(async () => {
    if (!projectId) {
      setError('Project ID not found.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await projectsAPI.getProjectDeployments(projectId);
      const fetchedDeployments = response.data;
      
      // Load active deployments from localStorage
      const storedActiveDeployments = localStorage.getItem(`activeDeployments_${projectId}`);
      let storedDeployments = [];
      if (storedActiveDeployments) {
        try {
          storedDeployments = JSON.parse(storedActiveDeployments);
        } catch (e) {
          console.error('Failed to parse stored active deployments:', e);
        }
      }
      
      // Merge fetched deployments with stored active deployments
      const mergedDeployments = [...fetchedDeployments];
      
      // Add stored active deployments that are not in fetched deployments
      storedDeployments.forEach(storedDeployment => {
        const exists = fetchedDeployments.find(d => d.id === storedDeployment.id);
        if (!exists && (storedDeployment.status === 'PENDING' || storedDeployment.status === 'IN_PROGRESS')) {
          mergedDeployments.unshift(storedDeployment); // Add to beginning
        }
      });
      
      // Update active deployments set
      const newActiveDeployments = new Set();
      mergedDeployments.forEach(deployment => {
        if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
          newActiveDeployments.add(deployment.id);
        }
      });
      setActiveDeployments(newActiveDeployments);
      
      setDeployments(mergedDeployments);
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
    
    // Cleanup function to remove active deployments from localStorage when component unmounts
    return () => {
      if (projectId) {
        // Only remove if there are no active deployments
        if (activeDeployments.size === 0) {
          localStorage.removeItem(`activeDeployments_${projectId}`);
        }
      }
    };
  }, [projectId, loadDeployments, activeDeployments.size]);

  // Check for new active deployments after initial load
  useEffect(() => {
    if (deployments.length > 0 && activeDeployments.size === 0) {
      // Check if there are any active deployments in the current list
      const hasActive = deployments.some(d => 
        d.status === 'PENDING' || d.status === 'IN_PROGRESS'
      );
      
      if (hasActive) {
        // Update active deployments set
        const newActiveDeployments = new Set();
        deployments.forEach(deployment => {
          if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
            newActiveDeployments.add(deployment.id);
          }
        });
        setActiveDeployments(newActiveDeployments);
        
        // Store in localStorage
        const activeDeploymentsToStore = deployments.filter(d => 
          d.status === 'PENDING' || d.status === 'IN_PROGRESS'
        );
        localStorage.setItem(`activeDeployments_${projectId}`, JSON.stringify(activeDeploymentsToStore));
      }
    }
  }, [deployments, activeDeployments.size, projectId]);

  const handleRefresh = async () => {
    if (!projectId) return;
    try {
      setRefreshing(true);
      const response = await projectsAPI.getProjectDeployments(projectId);
      const fetchedDeployments = response.data;
      
      // Load active deployments from localStorage
      const storedActiveDeployments = localStorage.getItem(`activeDeployments_${projectId}`);
      let storedDeployments = [];
      if (storedActiveDeployments) {
        try {
          storedDeployments = JSON.parse(storedActiveDeployments);
        } catch (e) {
          console.error('Failed to parse stored active deployments:', e);
        }
      }
      
      // Merge fetched deployments with stored active deployments
      const mergedDeployments = [...fetchedDeployments];
      
      // Add stored active deployments that are not in fetched deployments
      storedDeployments.forEach(storedDeployment => {
        const exists = fetchedDeployments.find(d => d.id === storedDeployment.id);
        if (!exists && (storedDeployment.status === 'PENDING' || storedDeployment.status === 'IN_PROGRESS')) {
          mergedDeployments.unshift(storedDeployment); // Add to beginning
        }
      });
      
      // Update active deployments set
      const newActiveDeployments = new Set();
      mergedDeployments.forEach(deployment => {
        if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
          newActiveDeployments.add(deployment.id);
        }
      });
      setActiveDeployments(newActiveDeployments);
      
      setDeployments(mergedDeployments);
      
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
        
        // Merge with current deployments to preserve active ones
        const currentDeployments = [...deployments];
        const updatedDeployments = [...newDeployments];
        
        // Add current active deployments that are not in new deployments
        currentDeployments.forEach(currentDeployment => {
          if ((currentDeployment.status === 'PENDING' || currentDeployment.status === 'IN_PROGRESS') &&
              !newDeployments.find(d => d.id === currentDeployment.id)) {
            updatedDeployments.unshift(currentDeployment);
          }
        });
        
        // Check for status changes and show notifications
        updatedDeployments.forEach(updatedDeployment => {
          const oldDeployment = deployments.find(d => d.id === updatedDeployment.id);
          
          // Check for new deployments that are active
          if (!oldDeployment && (updatedDeployment.status === 'PENDING' || updatedDeployment.status === 'IN_PROGRESS')) {
            console.log(`🆕 New active deployment detected: ${updatedDeployment.id} (${updatedDeployment.status})`);
          }
          
          // Check for status changes
          if (oldDeployment && oldDeployment.status !== updatedDeployment.status) {
            console.log(`🔄 Status changed for deployment ${updatedDeployment.id}: ${oldDeployment.status} → ${updatedDeployment.status}`);
            
            // Status changed - show notification
            if (updatedDeployment.status === 'SUCCESS') {
              // Show browser notification
              notificationService.showDeploymentNotification(updatedDeployment);
              
              // Show success toast
              notificationService.showSystemAlert(
                '🚀 Deployment Successful!',
                `Deployment of project '${updatedDeployment.project.name}' to ${updatedDeployment.environment.name} with version ${updatedDeployment.version} has been successfully completed in Jenkins`,
                'success'
              );
              
              // Remove from active deployments
              setActiveDeployments(prev => {
                const newSet = new Set(prev);
                newSet.delete(updatedDeployment.id);
                return newSet;
              });
            } else if (updatedDeployment.status === 'FAILED') {
              // Show browser notification
              notificationService.showSystemAlert(
                '❌ Deployment Failed',
                `Deployment of project '${updatedDeployment.project.name}' to ${updatedDeployment.environment.name} with version ${updatedDeployment.version} failed in Jenkins`,
                'error'
              );
              
              // Remove from active deployments
              setActiveDeployments(prev => {
                const newSet = new Set(prev);
                newSet.delete(updatedDeployment.id);
                return newSet;
              });
            }
            // Note: No notification for IN_PROGRESS status to avoid spam
            // Only show notifications for SUCCESS and FAILED statuses
          }
          
          // Check for build number updates (even if status hasn't changed)
          if (oldDeployment && 
              (!oldDeployment.jenkinsBuildNumber && updatedDeployment.jenkinsBuildNumber)) {
            console.log(`🔢 Build number updated for deployment ${updatedDeployment.id}: ${updatedDeployment.jenkinsBuildNumber}`);
          }
        });
        
        // Update active deployments set
        const newActiveDeployments = new Set();
        updatedDeployments.forEach(deployment => {
          if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
            newActiveDeployments.add(deployment.id);
          }
        });
        setActiveDeployments(newActiveDeployments);
        
        // Store active deployments in localStorage
        const activeDeploymentsToStore = updatedDeployments.filter(d => 
          d.status === 'PENDING' || d.status === 'IN_PROGRESS'
        );
        localStorage.setItem(`activeDeployments_${projectId}`, JSON.stringify(activeDeploymentsToStore));
        
        setDeployments(updatedDeployments);
      } catch (err) {
        console.error('Failed to check deployment status:', err);
        // Don't show error to user for background sync operations
        // Only log for debugging purposes
      }
    };

    // Always run monitoring to detect new deployments and update existing ones
    const interval = setInterval(checkDeploymentStatus, 3000);
    return () => clearInterval(interval);
  }, [deployments, projectId, activeDeployments]);

  // Auto-refresh deployment history every 60 seconds to ensure build numbers are up-to-date
  // This runs independently of the monitoring to provide fallback updates
  useEffect(() => {
    const autoRefreshDeployments = async () => {
      if (!projectId) return;
      try {
        console.log('🔄 Auto-refreshing deployment history for project:', projectId);
        const response = await projectsAPI.getProjectDeployments(projectId);
        const fetchedDeployments = response.data;
        
        // Merge with current deployments to preserve active ones
        const currentDeployments = [...deployments];
        const updatedDeployments = [...fetchedDeployments];
        
        // Add current active deployments that are not in fetched deployments
        currentDeployments.forEach(currentDeployment => {
          if ((currentDeployment.status === 'PENDING' || currentDeployment.status === 'IN_PROGRESS') &&
              !fetchedDeployments.find(d => d.id === currentDeployment.id)) {
            updatedDeployments.unshift(currentDeployment);
          }
        });
        
        setDeployments(updatedDeployments);
      } catch (err) {
        console.error('Failed to auto-refresh deployment history:', err);
      }
    };

    // Auto-refresh every 60 seconds
    const interval = setInterval(autoRefreshDeployments, 60000);
    return () => clearInterval(interval);
  }, [projectId, deployments]);

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
                    {(deployment.jenkinsBuildNumber || deployment.buildNumber) ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Build #{deployment.jenkinsBuildNumber || deployment.buildNumber}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Build #... (waiting for Jenkins)
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
