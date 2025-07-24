import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { settingsAPI } from '../../services/api';
import { 
  PlusIcon, 
  FolderIcon, 
  ServerIcon, 
  UserIcon,
  CogIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function UserQuickActions() {
  const { user } = useAuth();
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
    
    if (user?.role === 'ADMIN') {
      loadFeatureFlags();
    }
  }, [user?.role]);
  
  const quickActions = [
    {
      name: 'Create Project',
      description: 'Start a new project',
      icon: PlusIcon,
      href: '/projects/new',
      color: 'bg-blue-500 hover:bg-blue-600',
      showForRoles: ['ADMIN']
    },
    {
      name: 'View Projects',
      description: 'Browse all projects',
      icon: FolderIcon,
      href: '/projects',
      color: 'bg-green-500 hover:bg-green-600',
      showForRoles: ['ADMIN', 'DEVELOPER', 'USER']
    },
    {
      name: 'Manage Environments',
      description: 'Configure environments',
      icon: ServerIcon,
      href: '/projects',
      color: 'bg-purple-500 hover:bg-purple-600',
      showForRoles: ['ADMIN']
    },
    {
      name: 'Analytics',
      description: 'View system analytics',
      icon: ChartBarIcon,
      href: '/analytics',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      showForRoles: ['ADMIN'],
      requiresFeatureFlag: true
    },
    {
      name: 'User Management',
      description: 'Manage team members',
      icon: UserIcon,
      href: '/users',
      color: 'bg-orange-500 hover:bg-orange-600',
      showForRoles: ['ADMIN']
    },
    {
      name: 'Settings',
      description: 'Configure system',
      icon: CogIcon,
      href: '/settings',
      color: 'bg-gray-500 hover:bg-gray-600',
      showForRoles: ['ADMIN', 'DEVELOPER', 'USER']
    },
    {
      name: 'Preferences',
      description: 'Customize your experience',
      icon: Cog6ToothIcon,
      href: '/settings?tab=preferences',
      color: 'bg-teal-500 hover:bg-teal-600',
      showForRoles: ['ADMIN', 'DEVELOPER', 'USER']
    }
  ];

  // Filter actions berdasarkan role user dan feature flags
  const availableActions = quickActions.filter(action => {
    const hasRole = action.showForRoles.includes(user?.role || 'USER');
    const hasFeatureFlag = !action.requiresFeatureFlag || analyticsEnabled;
    return hasRole && hasFeatureFlag;
  });

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500">Common tasks for {user?.role?.toLowerCase() || 'user'}</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group relative bg-white p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 p-2 rounded-lg ${action.color} transition-colors duration-200`}>
                  <action.icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                    {action.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {availableActions.length === 0 && (
          <div className="text-center py-8">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No actions available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Contact your administrator for access to system features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 