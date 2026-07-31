import React, { useState, useEffect, useCallback } from 'react';
import { ServerIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { projectsAPI, jenkinsAPI, environmentsAPI, environmentAssignmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import EnvironmentStatusBadge from '../Common/EnvironmentStatusBadge';

const getStatusBadge = (status) => {
  return <EnvironmentStatusBadge status={status} size="sm" />;
};

export default function ProjectEnvironments({ project }) {
  const { isAdmin, user } = useAuth();
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [environmentStats, setEnvironmentStats] = useState({});

  // Assignments are only used here to filter which environments a
  // DEVELOPER/QA user is allowed to see. Managing who is assigned lives in
  // the Assignments tab (Environment Access section) to keep this tab focused
  // on environment status.
  const [assignments, setAssignments] = useState([]);

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
      const response = await environmentAssignmentAPI.getProjectEnvironmentAssignments(project.id);
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching environment assignments:', error);
    }
  }, [project.id]);

  useEffect(() => {
    fetchEnvironments();
    fetchAssignments();
  }, [project.id, fetchEnvironments, fetchAssignments]);

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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Environments</h3>
        <div className="flex items-center space-x-3">
          {isAdmin() && (
            <button
              onClick={() => fetchEnvironmentStats(environments)}
              disabled={loadingStats}
              className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
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
                  <div className="pt-3 border-t border-gray-200 dark:border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Feature Flags:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {loadingStats ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-white/10 h-4 w-4 rounded"></div>
                        ) : (
                          environmentStats[environment.id]?.featureFlags || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500 dark:text-gray-400">Configurations:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {loadingStats ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-white/10 h-4 w-4 rounded"></div>
                        ) : (
                          environmentStats[environment.id]?.configurations || 0
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
      })()}
    </div>
  );
}
