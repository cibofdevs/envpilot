import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI, settingsAPI } from '../../services/api';
import UsersList from './UsersList';
import UserForm from './UserForm';
import UserStats from './UserStats';
import { UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const UsersDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userRegistrationEnabled, setUserRegistrationEnabled] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalItems: 0,
    hasNext: false,
    hasPrevious: false
  });
  const [filters, setFilters] = useState({
    page: 0,
    size: 10,
    sortBy: 'createdAt',
    sortDir: 'desc',
    search: '',
    role: ''
  });

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesResponse, statsResponse, settingsResponse] = await Promise.all([
        usersAPI.getRoles(),
        usersAPI.getUserStats(),
        settingsAPI.getSystemSettings()
      ]);
      
      setRoles(rolesResponse.data);
      setStats(statsResponse.data);
      setUserRegistrationEnabled(settingsResponse.data.features?.userRegistrationEnabled ?? true);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers(filters);
      setUsers(response.data.users);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalItems: response.data.totalItems,
        hasNext: response.data.hasNext,
        hasPrevious: response.data.hasPrevious
      });
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.deleteUser(userId);
        loadUsers();
        loadInitialData(); // Refresh stats
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert('Failed to delete user');
      }
    }
  };

  const handleUserFormSubmit = async (userData) => {
    try {
      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, userData);
      } else {
        // Check feature flag before creating user
        if (!userRegistrationEnabled) {
          throw new Error('User registration is disabled by administrator');
        }
        await usersAPI.createUser(userData);
      }
      setShowUserForm(false);
      setEditingUser(null);
      loadUsers();
      loadInitialData(); // Refresh stats
    } catch (err) {
      console.error('Failed to save user:', err);
      throw err;
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const tabs = [
    { id: 'users', label: 'Users Management', icon: UsersIcon },
    { id: 'stats', label: 'User Statistics', icon: ChartBarIcon }
  ];

  if (loading && activeTab === 'stats') {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Users & Roles</h1>
        {activeTab === 'users' && userRegistrationEnabled && (
          <button
            onClick={handleCreateUser}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span>➕</span>
            Add User
          </button>
        )}
        {activeTab === 'users' && !userRegistrationEnabled && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
            User registration is disabled
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex flex-nowrap overflow-x-auto space-x-4 sm:space-x-8 px-2 sm:px-6" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 min-w-max whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <UsersList
          users={users}
          roles={roles}
          pagination={pagination}
          filters={filters}
          loading={loading}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {activeTab === 'stats' && (
        <UserStats stats={stats} roles={roles} />
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          roles={roles}
          onSubmit={handleUserFormSubmit}
          onCancel={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UsersDashboard;
