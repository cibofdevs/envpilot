import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jenkinsAPI, projectsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Common/Toast';
import { 
  PlayIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import BuildLogs from './BuildLogs';

export default function JenkinsDeployment({ project }) {
  const { canDeploy, canDeployToEnvironment } = useAuth();
  const { showSuccess, showError } = useToast();
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [buildStatus, setBuildStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [availableBuilds, setAvailableBuilds] = useState([]);
  const autoRefreshInterval = useRef(null);
  const autoRefreshTimeout = useRef(null);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await projectsAPI.getEnvironments(project.id);
      setEnvironments(response.data);
      if (response.data.length > 0) {
        // Load last selected environment from localStorage
        const lastSelectedEnv = localStorage.getItem(`lastSelectedEnvironment_${project.id}`);
        if (lastSelectedEnv && response.data.find(env => env.id.toString() === lastSelectedEnv)) {
          setSelectedEnvironment(lastSelectedEnv);
        } else {
          setSelectedEnvironment(response.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  }, [project.id]);

  const isJenkinsConfigured = useCallback(() => {
    return project.jenkinsUrl && project.jenkinsJobName && 
           project.jenkinsUsername && project.jenkinsToken;
  }, [project.jenkinsUrl, project.jenkinsJobName, project.jenkinsUsername, project.jenkinsToken]);

  const fetchBuildStatus = useCallback(async () => {
    if (!isJenkinsConfigured()) return;
    
    try {
      setLoadingStatus(true);
      const response = await jenkinsAPI.getBuildStatus(project.id);
      if (response.data.success) {
        setBuildStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching build status:', error);
    } finally {
      setLoadingStatus(false);
    }
  }, [project.id, isJenkinsConfigured]);

  const fetchAvailableBuilds = useCallback(async () => {
    if (!isJenkinsConfigured()) return;
    
    try {
      const response = await jenkinsAPI.getRecentBuilds(project.id, 20);
      if (response.data.success && response.data.builds) {
        setAvailableBuilds(response.data.builds);
      }
    } catch (error) {
      console.error('Error fetching available builds:', error);
    }
  }, [project.id, isJenkinsConfigured]);

  useEffect(() => {
    if (project) {
      fetchEnvironments();
      fetchBuildStatus();
      fetchAvailableBuilds();
    }
    return () => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
      if (autoRefreshTimeout.current) clearTimeout(autoRefreshTimeout.current);
    };
  }, [project, fetchEnvironments, fetchBuildStatus, fetchAvailableBuilds]);

  const startAutoRefreshBuildStatus = () => {
    if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    if (autoRefreshTimeout.current) clearTimeout(autoRefreshTimeout.current);
    // Set interval every 3s, stop after 30s
    autoRefreshInterval.current = setInterval(fetchBuildStatus, 3000);
    autoRefreshTimeout.current = setTimeout(() => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    }, 30000);
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    
    if (!canDeploy()) {
      showError('You do not have permission to deploy. Only ADMIN, DEVELOPER, and QA roles can deploy.');
      return;
    }
    
    if (!selectedEnvironment) {
      showError('Please select an environment');
      return;
    }

    // Validate access based on selected environment
    const selectedEnvObj = environments.find(env => env.id.toString() === selectedEnvironment);
    if (selectedEnvObj && !canDeployToEnvironment(selectedEnvObj.name)) {
      showError('Access denied. You can only deploy to development environment. Staging and production deployments are restricted to Admin users.');
      return;
    }

    try {
      setDeploying(true);
      
      const response = await jenkinsAPI.deployProject(
        project.id,
        selectedEnvironment,
        version || undefined,
        notes || undefined
      );

      if (response.data.success) {
        showSuccess(response.data.message);
        
        // Note: Bell notification will only be shown when deployment is completed (SUCCESS/FAILED)
        // to avoid spam notifications during trigger phase
        
        // Save the successfully deployed environment
        saveSelectedEnvironment(selectedEnvironment);
        
        // Clear form
        setVersion('');
        setNotes('');
        
        // Start auto-refresh build status
        setTimeout(() => {
          fetchBuildStatus();
          startAutoRefreshBuildStatus();
        }, 2000);
      } else {
        showError(response.data.message || 'Failed to trigger deployment');
      }
    } catch (error) {
      console.error('Error deploying project:', error);
      showError(error.response?.data?.message || 'Failed to trigger deployment');
    } finally {
      setDeploying(false);
    }
  };

  const saveSelectedEnvironment = (environmentId) => {
    localStorage.setItem(`lastSelectedEnvironment_${project.id}`, environmentId);
  };

  const clearSavedEnvironment = () => {
    localStorage.removeItem(`lastSelectedEnvironment_${project.id}`);
  };

  const getBuildStatusIcon = (status) => {
    const result = status?.result || status?.status;
    switch (result) {
      case 'SUCCESS':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'FAILURE':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'UNSTABLE':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'IN_PROGRESS':
      case null:
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBuildStatusText = (status) => {
    if (status?.building) return 'Building...';
    const result = status?.result || status?.status;
    switch (result) {
      case 'SUCCESS':
        return 'Success';
      case 'FAILURE':
        return 'Failed';
      case 'UNSTABLE':
        return 'Unstable';
      case 'IN_PROGRESS':
        return 'In Progress';
      default:
        return 'Unknown';
    }
  };

  const formatDuration = (duration) => {
    if (!duration || duration === 0) return 'N/A';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (!isJenkinsConfigured()) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Jenkins Not Configured</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure Jenkins settings in the Jenkins Config tab to enable deployments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deployment Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <PlayIcon className="h-5 w-5 mr-2 text-primary-600" />
            Deploy to Environment
          </h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleDeploy} className="space-y-6">
            {/* Environment Selection */}
            <div>
              <label htmlFor="environment" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Environment *
              </label>
              <select
                id="environment"
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                required
              >
                <option value="">Select an environment</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id} className="py-2">
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Version Input */}
            <div>
              <label htmlFor="version" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Version
                <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.0.0"
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
              />
            </div>

            {/* Notes Textarea */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Deployment Notes
                <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add deployment notes, changelog, or any important information..."
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={clearSavedEnvironment}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Clear Saved
              </button>
              <button
                type="submit"
                disabled={deploying}
                className="inline-flex items-center px-6 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {deploying ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
                    Deploy Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

            {/* Build Status */}
      {buildStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600" />
                Build Status
              </h3>
              <button
                onClick={fetchBuildStatus}
                disabled={loadingStatus}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-colors duration-200"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${loadingStatus ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getBuildStatusIcon(buildStatus)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Build #{buildStatus.buildNumber || buildStatus.number || 'N/A'}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (buildStatus.result || buildStatus.status) === 'SUCCESS' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    (buildStatus.result || buildStatus.status) === 'FAILURE' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    (buildStatus.result || buildStatus.status) === 'UNSTABLE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {getBuildStatusText(buildStatus)}
                  </span>
                </div>
                {(buildStatus.duration || buildStatus.duration === 0) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    ⏱️ Duration: {formatDuration(buildStatus.duration)}
                  </p>
                )}
                {(buildStatus.timestamp || buildStatus.timestamp === 0) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    🕒 Started: {formatTimestamp(buildStatus.timestamp)}
                  </p>
                )}
              </div>
            </div>
            
            {(buildStatus.description || buildStatus.description === '') && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {buildStatus.description || 'No description available'}
                </p>
              </div>
            )}

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                {showLogs ? 'Hide Logs' : 'View Logs'}
              </button>
              
              {availableBuilds.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Available builds:</span>
                  <div className="flex flex-wrap gap-1">
                    {availableBuilds.slice(0, 5).map((build) => (
                      <span
                        key={build.number}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        #{build.number}
                      </span>
                    ))}
                    {availableBuilds.length > 5 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        +{availableBuilds.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {showLogs && (
              <div className="mt-6">
                <BuildLogs 
                  project={project} 
                  buildNumber={buildStatus.buildNumber || buildStatus.number} 
                  onClose={() => {
                    console.log('BuildLogs onClose called, setting showLogs to false');
                    setShowLogs(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
