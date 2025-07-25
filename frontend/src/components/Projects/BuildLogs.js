import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { jenkinsAPI } from '../../services/api';
import { 
  DocumentTextIcon, 
  ArrowPathIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const BuildLogs = ({ project, buildNumber, onClose }) => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const refreshIntervalRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await jenkinsAPI.getBuildLogs(project.id, buildNumber);
      
      if (response.data.success) {
        setLogs(response.data.logs);
      } else {
        setError(response.data.message || 'Failed to fetch build logs');
      }
    } catch (err) {
      console.error('Error fetching build logs:', err);
      console.log('Error response data:', err.response?.data);
      console.log('Error status:', err.response?.status);
      
      let errorMessage = 'Failed to fetch build logs';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        console.log('Using backend error message:', errorMessage);
        
        // If the error message contains available builds, format it nicely
        if (errorMessage.includes('Available builds:')) {
          const parts = errorMessage.split('Available builds:');
          if (parts.length > 1) {
            const availableBuilds = parts[1].trim();
            errorMessage = `${parts[0].trim()}\n\nAvailable builds: ${availableBuilds}\n\n💡 Try selecting a different build number from the list above.`;
            console.log('Formatted error message with available builds');
          }
        }
      } else if (err.response?.status === 404) {
        errorMessage = 'Build not found. Please check if the build number exists and try again.';
        console.log('Using 404 fallback message');
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please check Jenkins credentials.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Please check Jenkins permissions.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      console.log('Final error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [project.id, buildNumber]);

  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    }

    // Add keyboard event listener for Escape key
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && onClose && typeof onClose === 'function') {
        console.log('Escape key pressed, calling onClose');
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [autoRefresh, onClose, fetchLogs]);

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Render modal using React Portal to ensure it's rendered at the top level
  return ReactDOM.createPortal(
    <div 
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[99999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose && typeof onClose === 'function') {
          console.log('Background clicked, calling onClose');
          onClose();
        }
      }}
    >
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl ${isExpanded ? 'w-full h-full' : 'w-4/5 h-3/4'} flex flex-col relative`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-3 sm:gap-0">
          {/* Kiri: Icon + Judul */}
          <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
            <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 flex-shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
                Build Logs - {project.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Build #{buildNumber || 'Latest'}
              </p>
            </div>
          </div>
          
          {/* Kanan: Tombol aksi */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Auto Refresh Toggle */}
            <button
              onClick={handleAutoRefreshToggle}
              className={`inline-flex items-center px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                autoRefresh 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowPathIcon className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </button>
            
            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-2.5 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={(e) => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();
                if (onClose && typeof onClose === 'function') {
                  console.log('Calling onClose function');
                  onClose();
                } else {
                  console.log('onClose is not a function:', onClose);
                }
              }}
              className="inline-flex items-center px-2.5 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              type="button"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center max-w-md">
                <div className="text-red-500 text-lg font-medium mb-3">❌ Error Loading Build Logs</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line leading-relaxed">
                  {error}
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={fetchLogs}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    🔄 Retry
                  </button>
                  <button
                    onClick={onClose}
                    className="ml-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-b-lg">
              <div className="space-y-0.5">
                {logs
                  ? logs.split('\n').map((line, index) => {
                      let className = 'text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900';
                      if (/error|failed|exception/i.test(line)) {
                        className = 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 font-semibold';
                      } else if (/warn|warning/i.test(line)) {
                        className = 'text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/30 font-semibold';
                      } else if (/success|passed|build successful/i.test(line)) {
                        className = 'text-green-700 dark:text-green-200 bg-green-50 dark:bg-green-900/30 font-semibold';
                      } else if (/info|starting|running|building/i.test(line)) {
                        className = 'text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30';
                      }
                      return (
                        <div
                          key={index}
                          className={`font-mono text-xs px-2 py-0.5 rounded ${className}`}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {line}
                        </div>
                      );
                    })
                  : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <div>
              {autoRefresh && (
                <span className="inline-flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  Auto refreshing every 5 seconds
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="inline-flex items-center px-3 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BuildLogs; 