import React, { useState, useEffect, useCallback } from 'react';
import { projectAssignmentAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Common/Toast';
import { 
  UserPlusIcon, 
  UserMinusIcon, 
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ProjectAssignments = ({ projectId, projectName }) => {
  const { isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [notes, setNotes] = useState('');

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await projectAssignmentAPI.getProjectAssignments(projectId);
      if (response.data.success) {
        setAssignments(response.data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchAssignments();
      fetchUsers();
    }
  }, [projectId, isAdmin, fetchAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      showError('Please select at least one user');
      return;
    }

    try {
      setAssigning(true);
      const response = await projectAssignmentAPI.assignUsersToProject(projectId, {
        userIds: selectedUsers,
        role: selectedRole,
        notes: notes
      });

      if (response.data.success) {
        showSuccess(response.data.message);
        setShowAssignModal(false);
        setSelectedUsers([]);
        setSelectedRole('MEMBER');
        setNotes('');
        fetchAssignments();
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('Failed to assign users to project');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from this project?`)) {
      return;
    }

    try {
      const response = await projectAssignmentAPI.removeUserFromProject(projectId, userId);
      if (response.data.success) {
        showSuccess(response.data.message);
        fetchAssignments();
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('Failed to remove user from project');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'MEMBER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin()) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Assignments</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Assignments</h3>
        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
        >
          <UserPlusIcon className="h-4 w-4 mr-2" />
          Assign Users
        </button>
      </div>

      {Array.isArray(assignments) && assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <UsersIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {assignment.userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {assignment.userEmail}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(assignment.role)}`}>
                      {assignment.role}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Assigned by {assignment.assignedBy} on {formatDate(assignment.assignedAt)}
                    </span>
                  </div>
                  {assignment.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {assignment.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {assignment.role !== 'OWNER' && (
                  <button
                    onClick={() => handleRemoveUser(assignment.userId, assignment.userName)}
                    className="inline-flex items-center px-2 py-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    title="Remove user from project"
                  >
                    <UserMinusIcon className="h-3 w-3 mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No users assigned to this project yet
          </p>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Assign Users to Project
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Users
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                    {Array.isArray(users) && users.length > 0 ? (
                      users.map((user) => (
                        <label key={user.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                            {user.name} ({user.email})
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No users available
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Add notes about this assignment..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignUsers}
                    disabled={assigning || selectedUsers.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {assigning ? 'Assigning...' : 'Assign Users'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAssignments; 