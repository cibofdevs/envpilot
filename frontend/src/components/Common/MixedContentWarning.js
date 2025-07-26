import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const MixedContentWarning = () => {
  return (
    <div className="mixed-content-warning fixed top-0 left-0 right-0 z-50 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-yellow-100 dark:bg-yellow-800">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
            </span>
            <p className="ml-3 font-medium text-sm text-yellow-800 dark:text-yellow-200">
              <span className="md:hidden">
                Mixed Content Error: Frontend (HTTPS) cannot connect to Backend (HTTP)
              </span>
              <span className="hidden md:inline">
                Mixed Content Error: This application is served over HTTPS but the backend server uses HTTP. 
                Some features may not work properly. Please contact your administrator to configure HTTPS for the backend server.
              </span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
            <div className="rounded-md shadow-sm">
              <button
                type="button"
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                onClick={() => {
                  // Reload page to try again
                  window.location.reload();
                }}
              >
                Try Again
              </button>
            </div>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              className="-mr-1 flex p-2 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 sm:-mr-2"
              onClick={() => {
                // Hide warning by adding a class to body
                document.body.classList.add('mixed-content-warning-hidden');
              }}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixedContentWarning; 