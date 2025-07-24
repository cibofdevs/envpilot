import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

const Footer = () => {
  const { appName, appVersion } = useApp();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
            <span>© {currentYear} {appName}. All rights reserved.</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <Link 
              to="/about" 
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              About
            </Link>
            <a 
              href="https://github.com/cibofdevs/envpilot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              GitHub
            </a>
            <span className="text-gray-400 dark:text-gray-500">{appVersion}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 