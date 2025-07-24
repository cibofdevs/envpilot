import React, { useState, useEffect, useCallback } from 'react';
import { jenkinsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ServerIcon,
  KeyIcon,
  UserIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function JenkinsConfig({ project, onUpdate }) {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState({
    jenkinsUrl: '',
    jenkinsJobName: '',
    jenkinsUsername: '',
    jenkinsToken: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchJenkinsConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await jenkinsAPI.getConfig(project.id);
      if (response.data.success) {
        const jenkinsConfig = response.data.config;
        setConfig(prev => ({
          ...prev,
          jenkinsUrl: jenkinsConfig.jenkinsUrl || '',
          jenkinsJobName: jenkinsConfig.jenkinsJobName || '',
          jenkinsUsername: jenkinsConfig.jenkinsUsername || '',
          // Don't overwrite token if it exists
          jenkinsToken: jenkinsConfig.hasJenkinsToken ? prev.jenkinsToken : '',
        }));
      }
    } catch (error) {
      console.error('Error fetching Jenkins config:', error);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (project) {
      setConfig({
        jenkinsUrl: project.jenkinsUrl || '',
        jenkinsJobName: project.jenkinsJobName || '',
        jenkinsUsername: project.jenkinsUsername || '',
        jenkinsToken: project.jenkinsToken || '',
      });
      fetchJenkinsConfig();
    }
  }, [project, fetchJenkinsConfig]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    setMessage(null);
    setTestResult(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await jenkinsAPI.updateConfig(project.id, config);
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Jenkins configuration saved successfully!'
        });
        
        // Update the project in parent component
        if (onUpdate) {
          onUpdate(response.data.project);
        }
      }
    } catch (error) {
      console.error('Error saving Jenkins config:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save Jenkins configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      // First save the config if it's changed
      await jenkinsAPI.updateConfig(project.id, config);
      
      const response = await jenkinsAPI.testConnection(project.id);
      
      if (response.data.success) {
        setTestResult({
          type: 'success',
          message: response.data.message,
          details: {
            jobName: response.data.jobName,
            jobUrl: response.data.jobUrl
          }
        });
      } else {
        setTestResult({
          type: 'error',
          message: response.data.message
        });
      }
    } catch (error) {
      console.error('Error testing Jenkins connection:', error);
      setTestResult({
        type: 'error',
        message: error.response?.data?.message || 'Failed to test Jenkins connection'
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigComplete = config.jenkinsUrl && config.jenkinsJobName && 
                          config.jenkinsUsername && config.jenkinsToken;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Jenkins Configuration</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure Jenkins integration to enable automated deployments for this project.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`rounded-md p-4 ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800' : 
          'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-md p-4 ${
          testResult.type === 'success' ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800' : 
          'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {testResult.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                testResult.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {testResult.message}
              </p>
              {testResult.details && (
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>Job Name: {testResult.details.jobName}</p>
                  {isAdmin() && (
                    <p>Job URL: <a href={testResult.details.jobUrl} target="_blank" rel="noopener noreferrer" 
                       className="underline hover:text-green-900 dark:hover:text-green-100">{testResult.details.jobUrl}</a></p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Server Configuration Section */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ServerIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
            Server Configuration
          </h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="jenkinsUrl" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Jenkins URL *
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="jenkinsUrl"
                  name="jenkinsUrl"
                  value={config.jenkinsUrl}
                  onChange={handleInputChange}
                  placeholder="https://jenkins.example.com:8080"
                  className="block w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                The complete URL of your Jenkins server (include protocol and port)
              </p>
            </div>

            <div>
              <label htmlFor="jenkinsJobName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Job Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="jenkinsJobName"
                  name="jenkinsJobName"
                  value={config.jenkinsJobName}
                  onChange={handleInputChange}
                  placeholder="my-deployment-job"
                  className="block w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                The exact name of the Jenkins job that will handle deployments
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <KeyIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Authentication
          </h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="jenkinsUsername" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Username *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  id="jenkinsUsername"
                  name="jenkinsUsername"
                  value={config.jenkinsUsername}
                  onChange={handleInputChange}
                  placeholder="jenkins-user"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                Your Jenkins username or service account
              </p>
            </div>

            <div>
              <label htmlFor="jenkinsToken" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                API Token *
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  id="jenkinsToken"
                  name="jenkinsToken"
                  value={config.jenkinsToken}
                  onChange={handleInputChange}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                  <InformationCircleIcon className="h-4 w-4 mr-1" />
                  Use Jenkins API token for better security
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Generate token: Jenkins → User → Configure → API Token
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="flex items-center space-x-2">
          {isConfigComplete ? (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">Configuration complete</span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">Please fill in all required fields</span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!isConfigComplete || testing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400 mr-2"></div>
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
