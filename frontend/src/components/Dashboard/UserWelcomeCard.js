import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { config } from '../../config/config';

export default function UserWelcomeCard() {
  const { user } = useAuth();
  
  // Get user photo from user.profilePhoto if available
  const userPhoto = user?.profilePhoto;

  // Function to get only the first name
  const getFirstName = (fullName) => {
    if (!fullName) return 'User';
    return fullName.split(' ')[0];
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-lg shadow-sm border border-blue-200 dark:border-gray-700 p-4 sm:p-6">
      {/* Mobile Layout - Stacked */}
      <div className="block sm:hidden">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex-shrink-0">
            {userPhoto && config.getStaticFileUrl(userPhoto) ? (
              <img
                src={config.getStaticFileUrl(userPhoto)}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-gray-700 flex items-center justify-center shadow-lg">
                <svg className="h-8 w-8 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8c0 2.208-1.79 4-3.998 4-2.208 0-3.998-1.792-3.998-4s1.79-4 3.998-4c2.208 0 3.998 1.792 3.998 4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back, {getFirstName(user?.name)}! 👋
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Here's what's happening with your projects and environments today
            </p>
            <div className="mt-3 flex flex-col items-center space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                <span className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full mr-2"></span>
                {user?.role || 'User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Today</div>
              <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tablet Layout - Horizontal with smaller spacing */}
      <div className="hidden sm:block lg:hidden">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {userPhoto && config.getStaticFileUrl(userPhoto) ? (
              <img
                src={config.getStaticFileUrl(userPhoto)}
                alt="Profile"
                className="h-14 w-14 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-lg"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 flex items-center justify-center shadow-lg">
                <svg className="h-7 w-7 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8c0 2.208-1.79 4-3.998 4-2.208 0-3.998-1.792-3.998-4s1.79-4 3.998-4c2.208 0 3.998 1.792 3.998 4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              Welcome back, {getFirstName(user?.name)}! 👋
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
              Here's what's happening with your projects and environments today
            </p>
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                <span className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full mr-1.5"></span>
                {user?.role || 'User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Today</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original design */}
      <div className="hidden lg:block">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {userPhoto && config.getStaticFileUrl(userPhoto) ? (
              <img
                src={config.getStaticFileUrl(userPhoto)}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 flex items-center justify-center shadow-lg">
                <svg className="h-8 w-8 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8c0 2.208-1.79 4-3.998 4-2.208 0-3.998-1.792-3.998-4s1.79-4 3.998-4c2.208 0 3.998 1.792 3.998 4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back, {getFirstName(user?.name)}! 👋
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Here's what's happening with your projects and environments today
            </p>
            <div className="mt-3 flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                <span className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full mr-2"></span>
                {user?.role || 'User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Today</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 