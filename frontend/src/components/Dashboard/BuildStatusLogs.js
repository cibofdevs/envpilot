import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DocumentTextIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import BuildLogs from '../Projects/BuildLogs';

const BuildStatusLogs = () => {
  const [recentBuilds, setRecentBuilds] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBuildNumber, setSelectedBuildNumber] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('buildLogsItemsPerPage');
    return saved ? parseInt(saved) : 5;
  }); // Show 5 items per page
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  const { isAdmin } = useAuth();

  // Pagination calculations (moved up to avoid initialization error)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBuilds = recentBuilds.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    const maxPage = Math.ceil(recentBuilds.length / itemsPerPage);
    const newPage = Math.max(1, Math.min(page, maxPage));
    if (newPage !== currentPage) {
      setIsPageTransitioning(true);
      setTimeout(() => {
        setCurrentPage(newPage);
        setIsPageTransitioning(false);
        // Smooth scroll to top of the component
        const element = document.querySelector('.bg-white.dark\\:bg-gray-900.shadow.rounded-lg.p-6');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    const maxPage = Math.ceil(recentBuilds.length / itemsPerPage);
    if (currentPage < maxPage) {
      goToPage(currentPage + 1);
    }
  };

  useEffect(() => {
    fetchProjectsAndBuilds();
  }, []);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (event) => {
      const maxPage = Math.ceil(recentBuilds.length / itemsPerPage);
      if (maxPage <= 1) return;
      
      if (event.key === 'ArrowLeft' && currentPage > 1) {
        event.preventDefault();
        goToPreviousPage();
      } else if (event.key === 'ArrowRight' && currentPage < maxPage) {
        event.preventDefault();
        goToNextPage();
      } else if (event.key === 'Home') {
        event.preventDefault();
        goToPage(1);
      } else if (event.key === 'End') {
        event.preventDefault();
        goToPage(maxPage);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, recentBuilds.length, itemsPerPage, goToNextPage, goToPage, goToPreviousPage]);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [recentBuilds, itemsPerPage]);

  const fetchProjectsAndBuilds = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First try to get recent builds from Jenkins
      const buildsResponse = await dashboardAPI.getRecentBuilds();
      
      if (buildsResponse.data.success && buildsResponse.data.builds && buildsResponse.data.builds.length > 0) {
        setRecentBuilds(buildsResponse.data.builds || []);
        setProjects(buildsResponse.data.projects || []);
        
        // Set first Jenkins project as selected
        const firstJenkinsProject = buildsResponse.data.projects?.find(p => p.jenkinsUrl && p.jenkinsJobName);
        if (firstJenkinsProject) {
          setSelectedProject(firstJenkinsProject);
        }
      } else {
        // If no Jenkins builds, try to get recent deployments from database
        console.log('No Jenkins builds found, trying deployment history...');
        const deploymentsResponse = await dashboardAPI.getRecentDeployments();
        
        if (deploymentsResponse.data.success && deploymentsResponse.data.deployments && deploymentsResponse.data.deployments.length > 0) {
          // Convert deployments to build format for consistency
          const deploymentsAsBuilds = deploymentsResponse.data.deployments.map(deployment => ({
            number: deployment.jenkinsBuildNumber || deployment.id,
            result: deployment.status === 'SUCCESS' ? 'SUCCESS' : 
                   deployment.status === 'FAILED' ? 'FAILURE' : 
                   deployment.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'UNKNOWN',
            building: deployment.status === 'IN_PROGRESS',
            timestamp: new Date(deployment.createdAt).getTime(),
            duration: deployment.completedAt ? 
              new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime() : 0,
            url: deployment.jenkinsBuildUrl || '#',
            description: `Deployment to ${deployment.environmentName} - ${deployment.notes || 'No notes'}`,
            triggeredByUserId: deployment.triggeredByUserId,
            triggeredByUserName: deployment.triggeredByUserName,
            triggeredByUserEmail: deployment.triggeredByUserEmail,
            projectId: deployment.projectId,
            projectName: deployment.projectName,
            isFromDeploymentHistory: true // Flag to indicate this is from deployment history
          }));
          
          setRecentBuilds(deploymentsAsBuilds);
          setProjects([]); // No project list for deployments
        } else {
          setRecentBuilds([]);
          setProjects([]);
        }
      }
    } catch (err) {
      console.error('Error fetching builds/deployments:', err);
      if (err.response && err.response.status === 404) {
        setRecentBuilds([]); // treat as no builds, not error
        setError('');
      } else {
        setError('Failed to fetch recent builds');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pagination component
  const Pagination = () => {
    const maxPage = Math.ceil(recentBuilds.length / itemsPerPage);
    if (maxPage <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (maxPage <= maxVisiblePages) {
        // Show all pages if total is small
        for (let i = 1; i <= maxPage; i++) {
          pages.push(i);
        }
      } else {
        // Show pages around current page
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(maxPage, currentPage + 2);
        
        // Adjust if we're near the edges
        if (currentPage <= 3) {
          end = Math.min(maxPage, 5);
        } else if (currentPage >= maxPage - 2) {
          start = Math.max(1, maxPage - 4);
        }
        
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }
      
      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <span>
                Showing {startIndex + 1} to {Math.min(endIndex, recentBuilds.length)} of {recentBuilds.length} builds
              </span>
              {maxPage > 1 && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  (Page {currentPage} of {maxPage})
                </span>
              )}
            </div>
            {maxPage > 1 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Use ← → arrows, Home, or End keys to navigate
              </div>
            )}
          </div>
        
        <div className="flex items-center space-x-1">
          {/* Previous button */}
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="inline-flex items-center px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          
          {/* First page button (if not visible) */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => goToPage(1)}
                className="inline-flex items-center px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                1
              </button>
              {pageNumbers[0] > 2 && (
                <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
              )}
            </>
          )}
          
          {/* Page numbers */}
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`inline-flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
          
          {/* Last page button (if not visible) */}
          {pageNumbers[pageNumbers.length - 1] < maxPage && (
            <>
              {pageNumbers[pageNumbers.length - 1] < maxPage - 1 && (
                <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
              )}
              <button
                onClick={() => goToPage(maxPage)}
                className="inline-flex items-center px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {maxPage}
              </button>
            </>
          )}
          
          {/* Next button */}
          <button
            onClick={goToNextPage}
            disabled={currentPage === maxPage}
            className="inline-flex items-center px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const getBuildStatusIcon = (build) => {
    if (build.building) {
      return <ClockIcon className="h-5 w-5 text-blue-500" />;
    }
    
    switch (build.result) {
      case 'SUCCESS':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'FAILURE':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'UNSTABLE':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBuildStatusText = (build) => {
    if (build.building) return 'Building...';
    switch (build.result) {
      case 'SUCCESS':
        return 'Success';
      case 'FAILURE':
        return 'Failed';
      case 'UNSTABLE':
        return 'Unstable';
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
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleViewLogs = (project, buildNumber) => {
    if (!project) {
      console.error('Project not found for build');
      return;
    }
    setSelectedProject(project);
    setSelectedBuildNumber(buildNumber);
    setShowLogs(true);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Build Logs</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Build Logs</h3>
                  <button
          onClick={fetchProjectsAndBuilds}
          className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Retry
        </button>
        </div>
        <div className="text-center py-8">
          <div className="text-red-500 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-600 dark:text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Build Logs</h3>
        <div className="flex items-center space-x-3">
          {/* Items per page selector */}
          {recentBuilds.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
                              <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setItemsPerPage(newValue);
                    localStorage.setItem('buildLogsItemsPerPage', newValue.toString());
                  }}
                  className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          )}
          
          <button
            onClick={fetchProjectsAndBuilds}
            disabled={loading}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {recentBuilds.length > 0 ? (
        <>
          <div className={`space-y-3 transition-opacity duration-150 ${isPageTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            {isPageTransitioning && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            )}
            {currentBuilds.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No builds found on this page
                </p>
              </div>
            ) : (
              currentBuilds.map((build, index) => {
                // Find the project for this build
                const project = projects.find(p => p.id === build.projectId);
              
                return (
                  <div key={`${build.projectId}-${build.number}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center space-x-3">
                      {getBuildStatusIcon(build)}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {build.projectName || project?.name || 'Unknown Project'} - {build.isFromDeploymentHistory ? 'Deployment' : 'Build'} #{build.number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getBuildStatusText(build)} • {formatDuration(build.duration)} • {formatTimestamp(build.timestamp)}
                          {build.triggeredByUserName && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              • Triggered by {build.triggeredByUserName}
                            </span>
                          )}
                          {build.isFromDeploymentHistory && (
                            <span className="ml-2 text-purple-600 dark:text-purple-400">
                              • From Database
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!build.isFromDeploymentHistory ? (
                        <button
                          onClick={() => handleViewLogs(project, build.number)}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          View Logs
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          Deployment Record
                        </span>
                      )}
                      
                      {build.url && isAdmin() && (
                        <a
                          href={build.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-primary-600 hover:text-primary-500 transition-colors"
                        >
                          Jenkins
                          <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Pagination */}
          <Pagination />
        </>
      ) : (
        <div className="text-center py-8">
          <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {(() => {
              if (projects.length === 0) {
                if (isAdmin()) {
                  return 'No projects available';
                } else {
                  return 'You haven\'t been assigned to any projects yet. Please contact your administrator to get access.';
                }
              } else if (projects.filter(p => p.jenkinsUrl && p.jenkinsJobName).length === 0) {
                if (isAdmin()) {
                  return 'No projects with Jenkins configuration found';
                } else {
                  return 'Your assigned projects don\'t have Jenkins configuration yet.';
                }
              } else if (recentBuilds.length === 0) {
                if (isAdmin()) {
                  return 'No recent builds available';
                } else {
                  return 'You haven\'t performed any builds yet. Build logs will appear here after you deploy to environments.';
                }
              } else {
                return 'No recent builds available';
              }
            })()}
          </p>
        </div>
      )}

      {/* Build Logs Modal */}
      {showLogs && selectedProject && selectedBuildNumber && (
        <BuildLogs
          project={selectedProject}
          buildNumber={selectedBuildNumber}
          onClose={() => {
            setShowLogs(false);
            setSelectedBuildNumber(null);
          }}
        />
      )}
    </div>
  );
};

export default BuildStatusLogs; 