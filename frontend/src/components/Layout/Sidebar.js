import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { settingsAPI } from '../../services/api';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
];

const adminNavigation = [
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Users & Roles', href: '/users', icon: UsersIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    const loadFeatureFlags = async () => {
      try {
        const response = await settingsAPI.getSystemSettings();
        setAnalyticsEnabled(response.data.features?.analyticsEnabled ?? true);
      } catch (err) {
        console.error('Failed to load feature flags:', err);
      }
    };
    
    if (isAdmin()) {
      loadFeatureFlags();
    }
  }, [isAdmin]);

  const getAdminNavigation = () => {
    const nav = [];
    if (analyticsEnabled) {
      nav.push(adminNavigation[0]); // Analytics
    }
    nav.push(adminNavigation[1]); // Users & Roles
    nav.push(adminNavigation[2]); // Settings
    return nav;
  };

  const allNavigation = isAdmin() ? [...navigation, ...getAdminNavigation()] : navigation;

  return (
    <div className="flex flex-col bg-gray-800 w-full h-full relative z-20">
      {/* Logo/Brand Section */}
      <div className="flex items-center h-16 flex-shrink-0 px-3 sm:px-4 bg-gray-900 relative z-20">
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">
            <img 
              src="/logo.svg" 
              alt="EnvPilot Logo" 
              className="h-8 w-8"
            />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <h1 className="text-white text-sm sm:text-base lg:text-lg font-semibold truncate">EnvPilot</h1>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {allNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={classNames(
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none'
                )}
              >
                <item.icon
                  className={classNames(
                    isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
                    'mr-2 sm:mr-3 flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate text-xs sm:text-sm lg:text-base">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
