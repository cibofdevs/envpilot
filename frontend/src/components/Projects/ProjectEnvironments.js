import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  ServerIcon, 
  GlobeAltIcon, 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  UserPlusIcon,
  UserMinusIcon,
  XMarkIcon,
  UsersIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { projectsAPI, jenkinsAPI, environmentsAPI, environmentAssignmentAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Common/Toast';
import EnvironmentStatusBadge from '../Common/EnvironmentStatusBadge';
import BuildLogs from './BuildLogs';

function Toast({ show, type, message, onClose }) {
  if (!show) return null;
  return (
    <div className={`fixed top-6 right-6 z-[9996] min-w-[260px] max-w-xs flex items-center px-4 py-3 rounded-lg shadow-lg transition-all duration-300
      ${type === 'success' ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800'}`}
    >
      <span className="mr-3">
        {type === 'success' ? (
          <CheckCircleIcon className="h-6 w-6 text-green-500 dark:text-green-400" />
        ) : (
          <XCircleIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
        )}
      </span>
      <div className="flex-1">
        <span className={`block font-semibold mb-0.5 ${type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{type === 'success' ? 'Successful Deployment' : 'Deployment Failed'}</span>
        <span className="block text-sm text-gray-700 dark:text-gray-300">{message}</span>
      </div>
      <button onClick={onClose} className="ml-4 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none">✕</button>
    </div>
  );
}

const getStatusBadge = (status) => {
  return <EnvironmentStatusBadge status={status} size="sm" />;
};

export default function ProjectEnvironments({ project }) {
  const { canDeploy, canDeployToEnvironment, isAdmin, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [deployingEnv, setDeployingEnv] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const [environmentStats, setEnvironmentStats] = useState({});
  
  // Environment Assignment states
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [notes, setNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Log real-time states
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [lastBuildNumber, setLastBuildNumber] = useState(null);
  const [lastDeployedEnvironment, setLastDeployedEnvironment] = useState(null);
  const [lastBuildProjectId, setLastBuildProjectId] = useState(null);

  const fetchEnvironmentStats = useCallback(async (envs) => {
    // Only fetch stats for admin users
    if (!isAdmin()) {
      setLoadingStats(false);
      return;
    }
    
    try {
      setLoadingStats(true);
      const statsPromises = envs.map(async (env) => {
        try {
          const [featureFlagsResponse, configurationsResponse] = await Promise.all([
            environmentsAPI.getFeatureFlags(env.id),
            environmentsAPI.getConfigurations(env.id)
          ]);
          
          return {
            envId: env.id,
            featureFlags: featureFlagsResponse.data?.length || 0,
            configurations: configurationsResponse.data?.length || 0
          };
        } catch (error) {
          console.error(`Error fetching stats for environment ${env.id}:`, error);
          return {
            envId: env.id,
            featureFlags: 0,
            configurations: 0
          };
        }
      });
      
      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat.envId] = {
          featureFlags: stat.featureFlags,
          configurations: stat.configurations
        };
      });
      
      setEnvironmentStats(statsMap);
    } catch (error) {
      console.error('Error fetching environment stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [isAdmin]);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await projectsAPI.getEnvironments(project.id);
      setEnvironments(response.data);
      // Fetch feature flags and configurations for each environment (admin only)
      if (isAdmin()) {
        await fetchEnvironmentStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching environments:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id, isAdmin, fetchEnvironmentStats]);

  const fetchAssignments = useCallback(async () => {
    try {
      console.log('Fetching assignments for project:', project.id);
      const response = await environmentAssignmentAPI.getProjectEnvironmentAssignments(project.id);

      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching environment assignments:', error);
    }
  }, [project.id]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchEnvironments();
    fetchAssignments();
    if (isAdmin()) {
      fetchUsers();
    }
  }, [project.id, isAdmin, fetchEnvironments, fetchAssignments, fetchUsers]);

  // Real-time polling for deployment status
  useEffect(() => {
    const pollDeploymentStatus = async () => {
      // Check if any environment is deploying
      const deployingEnvironments = environments.filter(env => 
        env.status === 'DEPLOYING' || env.status === 'IN_PROGRESS'
      );
      
      if (deployingEnvironments.length > 0) {
        try {
          // First, sync all active deployments from Jenkins
          await jenkinsAPI.syncAllDeployments();
          
          // Then fetch latest environment status
          const response = await projectsAPI.getEnvironments(project.id);
          setEnvironments(response.data);
          
          // Update stats if admin
          if (isAdmin()) {
            await fetchEnvironmentStats(response.data);
          }
        } catch (error) {
          console.error('Error polling deployment status:', error);
        }
      }
    };

    // Poll every 3 seconds if there are deploying environments
    const deployingEnvironments = environments.filter(env => 
      env.status === 'DEPLOYING' || env.status === 'IN_PROGRESS'
    );
    
    if (deployingEnvironments.length > 0) {
      const interval = setInterval(pollDeploymentStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [environments, project.id, isAdmin, fetchEnvironmentStats]);

  // Reset build info when project changes
  useEffect(() => {
    if (lastBuildProjectId && lastBuildProjectId !== project.id) {
      console.log(`🔄 Project changed from ${lastBuildProjectId} to ${project.id}, resetting build info`);
      setLastBuildNumber(null);
      setLastDeployedEnvironment(null);
      setLastBuildProjectId(null);
      setShowLogsModal(false);
    }
  }, [project.id, lastBuildProjectId]);

  // Note: Auto-refresh build number mechanism removed since backend now returns correct build number

  const handleQuickDeploy = async (environmentId) => {
    if (!canDeploy()) {
      setToast({ show: true, type: 'error', message: 'You do not have permission to deploy. Only ADMIN, DEVELOPER, and QA roles can deploy.' });
      setTimeout(() => setToast({ show: false }), 3500);
      return;
    }
    
    const envObj = environments.find(env => env.id === environmentId);
    if (!envObj) {
      setToast({ show: true, type: 'error', message: 'Environment not found.' });
      setTimeout(() => setToast({ show: false }), 3500);
      return;
    }

    // Validate access based on environment
    if (!canDeployToEnvironment(envObj.name)) {
      setToast({ show: true, type: 'error', message: `Access denied. You can only deploy to development environment. Staging and production deployments are restricted to Admin users.` });
      setTimeout(() => setToast({ show: false }), 3500);
      return;
    }
    
    if (!isJenkinsConfigured()) {
      setToast({ show: true, type: 'error', message: 'Jenkins is not configured for this project. Please configure Jenkins first.' });
      setTimeout(() => setToast({ show: false }), 3500);
      return;
    }
    try {
      setDeployingEnv(environmentId);
      
      // Generate version based on current timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const version = `1.0.0-${timestamp}`;
      
      // Send envName to backend so it can be forwarded to Jenkins
      const response = await jenkinsAPI.deployProject(project.id, environmentId, version, `Quick deploy to ${envObj?.name}`, envObj?.name);
      if (response.data.success) {
        // Save build info for real-time log
        if (response.data.buildNumber) {
          setLastBuildNumber(response.data.buildNumber);
          setLastDeployedEnvironment(envObj);
          setLastBuildProjectId(project.id);
          console.log(`🚀 Build #${response.data.buildNumber} triggered for project ${project.name} (ID: ${project.id})`);
        }
        
        setToast({ 
          show: true, 
          type: 'success', 
          message: `${response.data.message || 'Deployment triggered successfully!'} ${response.data.buildNumber ? `(Build #${response.data.buildNumber})` : ''}` 
        });
        
        // Refresh environment stats after successful deployment
        setTimeout(() => {
          fetchEnvironmentStats(environments);
        }, 2000);
      } else {
        setToast({ show: true, type: 'error', message: response.data.message || 'Failed to trigger deployment' });
      }
    } catch (error) {
      console.error('Error deploying:', error);
      let errorMessage = 'Deployment failed';
      
      if (error.response?.status === 403) {
        errorMessage = 'Access forbidden. You do not have permission to deploy. Please contact your administrator.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setToast({ show: true, type: 'error', message: errorMessage });
    } finally {
      setDeployingEnv(null);
      setTimeout(() => setToast({ show: false }), 3500);
    }
  };

  const isJenkinsConfigured = () => {
    return project.jenkinsUrl && project.jenkinsJobName && 
           project.jenkinsUsername && project.jenkinsToken;
  };

  // Environment Assignment functions
  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      showError('Please select at least one user');
      return;
    }

    if (!selectedEnvironment) {
      showError('Please select an environment');
      return;
    }

    try {
      setAssigning(true);
      
      // Get selected users with their original roles
      const selectedUserData = users.filter(user => selectedUsers.includes(user.id));
      
      // Process each user individually
      const assignmentPromises = selectedUserData.map(user => 
        environmentAssignmentAPI.assignUsersToEnvironment({
          userIds: [user.id],
          environmentId: selectedEnvironment,
          notes: notes
        })
      );
      
      const responses = await Promise.all(assignmentPromises);
      const allSuccessful = responses.every(response => response.data.success);
      
      if (allSuccessful) {
        showSuccess('Users assigned to environment successfully');
        setShowAssignModal(false);
        setSelectedUsers([]);
        setSelectedEnvironment('');
        setNotes('');
        
        // Update assignments state immediately without fetching from server
        // We need to add the new assignments to the state
        // Since we don't have the full assignment data from the response,
        // we'll fetch assignments to get the updated data
        fetchAssignments();
      } else {
        showError('Some assignments failed. Please try again.');
      }
    } catch (error) {
      showError('Failed to assign users to environment');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (environmentId, userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from this environment?`)) {
      return;
    }

    try {
      const response = await environmentAssignmentAPI.removeUserFromEnvironment(environmentId, userId);
      if (response.data.success) {
        showSuccess(response.data.message);
        
        // Update assignments state immediately without fetching from server
        // Change status to REVOKED instead of removing completely
        setAssignments(prevAssignments => 
          prevAssignments.map(assignment => 
            assignment.environmentId === environmentId && assignment.userId === userId
              ? { ...assignment, status: 'REVOKED' }
              : assignment
          )
        );
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('Failed to remove user from environment');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'DEVELOPER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'QA':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'INACTIVE':
        return <XCircleIcon className="h-4 w-4 text-gray-500" />;
      case 'REVOKED':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <XCircleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const getAssignmentsForEnvironment = (environmentId) => {
    return assignments.filter(assignment => 
      assignment.environmentId === environmentId && assignment.status === 'ACTIVE'
    );
  };

  // Sort environments in fixed order: development, staging, production
  const sortEnvironments = (envs) => {
    const order = ['development', 'staging', 'production'];
    return envs.sort((a, b) => {
      const aIndex = order.indexOf(a.name.toLowerCase());
      const bIndex = order.indexOf(b.name.toLowerCase());
      
      // If both environments are in the predefined order, sort by that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the predefined order, put it first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the predefined order, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  // Filter environments based on user role and assignments
  const getFilteredEnvironments = () => {
    let filteredEnvs;
    
    // Admin can see all environments
    if (isAdmin()) {
      filteredEnvs = environments;
    }
    // For DEVELOPER and QA roles, only show environments they are assigned to
    else if (user?.role === 'DEVELOPER' || user?.role === 'QA') {
      const userAssignments = assignments.filter(assignment => 
        assignment.userId === user.id && assignment.status === 'ACTIVE'
      );
      
      const assignedEnvironmentIds = userAssignments.map(assignment => assignment.environmentId);
      filteredEnvs = environments.filter(environment => assignedEnvironmentIds.includes(environment.id));
    }
    // For other roles, show all environments (fallback)
    else {
      filteredEnvs = environments;
    }
    
    // Sort the filtered environments in fixed order
    return sortEnvironments(filteredEnvs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast show={toast.show} type={toast.type} message={toast.message} onClose={() => setToast({ show: false })} />
      
      {/* Log Real-time Shortcut */}
      {lastBuildNumber && lastDeployedEnvironment && lastBuildProjectId === project.id && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Build #{lastBuildNumber} - {lastDeployedEnvironment.name}
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Deployment triggered successfully. View real-time logs to monitor progress.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowLogsModal(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View Logs
              </button>
              <button
                onClick={() => {
                  setLastBuildNumber(null);
                  setLastDeployedEnvironment(null);
                  setLastBuildProjectId(null);
                }}
                className="inline-flex items-center px-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Environments</h3>
        <div className="flex items-center space-x-3">
          {!canDeploy() && (
            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900 px-3 py-1 rounded-md border border-amber-200 dark:border-amber-800">
              ⚠️ Deploy permission required
            </div>
          )}
          {isAdmin() && (
            <button
              onClick={() => fetchEnvironmentStats(environments)}
              disabled={loadingStats}
              className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              title="Refresh environment stats"
            >
              <svg className={`h-4 w-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Stats
            </button>
          )}
        </div>
      </div>

      {(() => {
        const filteredEnvironments = getFilteredEnvironments();
        
        if (filteredEnvironments.length === 0) {
          if (environments.length === 0) {
            return (
              <div className="text-center py-12">
                <ServerIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No environments</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This project doesn't have any environments configured yet.
                </p>
              </div>
            );
          } else if (user?.role === 'DEVELOPER' || user?.role === 'QA') {
            return (
              <div className="text-center py-12">
                <ServerIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No assigned environments</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You haven't been assigned to any environments yet. Please contact your administrator to get access.
                </p>
              </div>
            );
          }
        }
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEnvironments.map((environment) => (
            <div key={environment.id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{environment.name}</h4>
                {getStatusBadge(environment.status)}
              </div>

              <div className="space-y-3">
                {environment.version && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Version:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{environment.version}</span>
                  </div>
                )}

                {environment.deploymentUrl && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">URL:</span>
                    <a
                      href={environment.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 inline-flex items-center"
                    >
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      View Deployment
                    </a>
                  </div>
                )}

                {environment.lastDeployedAt && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Deployed:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(environment.lastDeployedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}

                {/* Feature Flags and Configurations - Admin Only */}
                {isAdmin() && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Feature Flags:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {loadingStats ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-4 rounded"></div>
                        ) : (
                          environmentStats[environment.id]?.featureFlags || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500 dark:text-gray-400">Configurations:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {loadingStats ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-4 rounded"></div>
                        ) : (
                          environmentStats[environment.id]?.configurations || 0
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Environment Assignments Section - Admin Only */}
                {isAdmin() && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">User Assignments</h5>
                      <button
                        onClick={() => {
                          setSelectedEnvironment(environment.id);
                          setShowAssignModal(true);
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                      >
                        <UserPlusIcon className="h-3 w-3 mr-1" />
                        Assign
                      </button>
                    </div>
                    
                    {(() => {
                      const envAssignments = getAssignmentsForEnvironment(environment.id);
                      return envAssignments.length > 0 ? (
                        <div className="space-y-2">
                          {envAssignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                              <div className="flex items-center space-x-2">
                                <UsersIcon className="h-3 w-3 text-gray-400" />
                                <div>
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    {assignment.userName}
                                  </p>
                                  <div className="flex items-center space-x-1 mt-0.5">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(assignment.role)}`}>
                                      {assignment.role}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(assignment.status)}
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(assignment.assignedAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {assignment.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleRemoveUser(environment.id, assignment.userId, assignment.userName)}
                                  className="inline-flex items-center px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                  title="Remove user from environment"
                                >
                                  <UserMinusIcon className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">No users assigned</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Quick Deploy Button */}
                <div className="pt-3">
                  {!canDeployToEnvironment(environment.name) ? (
                    <div className="text-center">
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                        🔒 Admin Only
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Only Admin can deploy to {environment.name}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleQuickDeploy(environment.id)}
                      disabled={deployingEnv === environment.id || !isJenkinsConfigured() || !canDeploy()}
                      className={`w-full inline-flex items-center justify-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isJenkinsConfigured() && canDeploy()
                          ? 'border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900 hover:bg-primary-100 dark:hover:bg-primary-800 focus:ring-primary-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                      }`}
                      title={!canDeploy() ? 'Insufficient permissions' : !isJenkinsConfigured() ? 'Configure Jenkins first' : 'Quick deploy to this environment'}
                    >
                      {deployingEnv === environment.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-2" />
                          Quick Deploy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
      })()}

      {/* Assign Users Modal */}
      {showAssignModal && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAssignModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Assign Users to Environment
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Environment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Environment
                </label>
                <select
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Environment</option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Users
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                        {user.name} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>



              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add any notes about this assignment..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUsers}
                disabled={assigning || selectedUsers.length === 0 || !selectedEnvironment}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                    Assigning...
                  </>
                ) : (
                  'Assign Users'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Build Logs Modal */}
      {showLogsModal && lastBuildNumber && lastBuildProjectId === project.id && (
        <BuildLogs
          project={project}
          buildNumber={lastBuildNumber}
          onClose={() => setShowLogsModal(false)}
        />
      )}
    </div>
  );
}
