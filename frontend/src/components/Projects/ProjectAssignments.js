import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { projectAssignmentAPI, environmentAssignmentAPI, projectsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Common/Toast';
import {
  UserPlusIcon,
  UserMinusIcon,
  UsersIcon,
  XMarkIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

// Portal ensures the modal escapes the card's containing block (backdrop-blur
// on an ancestor makes `fixed` positioning relative to that ancestor, not the viewport).
function ModalPortal({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

const getRoleBadgeColor = (role) => {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200';
    case 'MEMBER':
    case 'DEVELOPER':
      return 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200';
    case 'QA':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'VIEWER':
      return 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300';
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

const ProjectAssignments = ({ projectId, projectName }) => {
  const { isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);

  // Project membership state
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [notes, setNotes] = useState('');

  // Environment access state
  const [environments, setEnvironments] = useState([]);
  const [envAssignments, setEnvAssignments] = useState([]);
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [envAssigning, setEnvAssigning] = useState(false);
  const [showEnvAssignModal, setShowEnvAssignModal] = useState(false);
  const [envSelectedUsers, setEnvSelectedUsers] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [envNotes, setEnvNotes] = useState('');

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

  const fetchUsers = useCallback(async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  }, []);

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await projectsAPI.getEnvironments(projectId);
      setEnvironments(response.data || []);
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  }, [projectId]);

  const fetchEnvAssignments = useCallback(async () => {
    try {
      const response = await environmentAssignmentAPI.getProjectEnvironmentAssignments(projectId);
      setEnvAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching environment assignments:', error);
    } finally {
      setLoadingEnv(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isAdmin()) {
      fetchAssignments();
      fetchUsers();
      fetchEnvironments();
      fetchEnvAssignments();
    }
  }, [projectId, isAdmin, fetchAssignments, fetchUsers, fetchEnvironments, fetchEnvAssignments]);

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

  const handleAssignUsersToEnvironment = async () => {
    if (envSelectedUsers.length === 0) {
      showError('Please select at least one user');
      return;
    }

    if (!selectedEnvironment) {
      showError('Please select an environment');
      return;
    }

    try {
      setEnvAssigning(true);
      const assignmentPromises = envSelectedUsers.map(userId =>
        environmentAssignmentAPI.assignUsersToEnvironment({
          userIds: [userId],
          environmentId: selectedEnvironment,
          notes: envNotes
        })
      );

      const responses = await Promise.all(assignmentPromises);
      const allSuccessful = responses.every(response => response.data.success);

      if (allSuccessful) {
        showSuccess('Users assigned to environment successfully');
        setShowEnvAssignModal(false);
        setEnvSelectedUsers([]);
        setSelectedEnvironment('');
        setEnvNotes('');
        fetchEnvAssignments();
      } else {
        showError('Some assignments failed. Please try again.');
      }
    } catch (error) {
      showError('Failed to assign users to environment');
    } finally {
      setEnvAssigning(false);
    }
  };

  const handleRemoveEnvironmentUser = async (environmentId, userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from this environment?`)) {
      return;
    }

    try {
      const response = await environmentAssignmentAPI.removeUserFromEnvironment(environmentId, userId);
      if (response.data.success) {
        showSuccess(response.data.message);
        setEnvAssignments(prev =>
          prev.map(assignment =>
            assignment.environmentId === environmentId && assignment.userId === userId
              ? { ...assignment, status: 'REVOKED' }
              : assignment
          )
        );
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      showError('Failed to remove user from environment');
    }
  };

  const getAssignmentsForEnvironment = (environmentId) => {
    return envAssignments.filter(assignment =>
      assignment.environmentId === environmentId && assignment.status === 'ACTIVE'
    );
  };

  if (!isAdmin()) {
    return null;
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Members</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Members */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Members</h3>
          <button
            onClick={() => setShowAssignModal(true)}
            className="btn-primary"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Assign Users
          </button>
        </div>

        {Array.isArray(assignments) && assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
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
      </div>

      {/* Environment Access */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Environment Access</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Controls which environments DEVELOPER and QA users can see and deploy to. Admins always see every environment.
        </p>

        {loadingEnv ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : environments.length === 0 ? (
          <div className="text-center py-8">
            <ServerIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This project doesn't have any environments yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {environments.map((environment) => {
              const envUsers = getAssignmentsForEnvironment(environment.id);
              return (
                <div key={environment.id} className="border border-gray-200 dark:border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{environment.name}</h4>
                    <button
                      onClick={() => {
                        setSelectedEnvironment(environment.id);
                        setShowEnvAssignModal(true);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                      <UserPlusIcon className="h-3 w-3 mr-1" />
                      Assign
                    </button>
                  </div>

                  {envUsers.length > 0 ? (
                    <div className="space-y-2">
                      {envUsers.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <UsersIcon className="h-3 w-3 text-gray-400" />
                            <div>
                              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                {assignment.userName}
                              </p>
                              <div className="flex items-center space-x-1 mt-0.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(assignment.role)}`}>
                                  {assignment.role}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(assignment.assignedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveEnvironmentUser(environment.id, assignment.userId, assignment.userName)}
                            className="inline-flex items-center px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                            title="Remove user from environment"
                          >
                            <UserMinusIcon className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No users assigned</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Users to Project Modal */}
      {showAssignModal && (
        <ModalPortal>
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="card relative top-20 mx-auto p-6 w-96">
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
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-white/10 rounded-lg">
                    {Array.isArray(users) && users.length > 0 ? (
                      users.map((u) => (
                        <label key={u.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, u.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                            {u.name} ({u.email})
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
                    className="input-field"
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
                    className="input-field"
                    placeholder="Add notes about this assignment..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignUsers}
                    disabled={assigning || selectedUsers.length === 0}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? 'Assigning...' : 'Assign Users'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Assign Users to Environment Modal */}
      {showEnvAssignModal && (
        <ModalPortal>
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[99999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEnvAssignModal(false);
            }
          }}
        >
          <div className="card max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Assign Users to Environment
              </h3>
              <button
                onClick={() => setShowEnvAssignModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Environment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Environment
                </label>
                <select
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select Environment</option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Users
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-white/10 rounded-lg">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={envSelectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEnvSelectedUsers([...envSelectedUsers, u.id]);
                          } else {
                            setEnvSelectedUsers(envSelectedUsers.filter(id => id !== u.id));
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                        {u.name} ({u.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={envNotes}
                  onChange={(e) => setEnvNotes(e.target.value)}
                  rows="3"
                  className="input-field"
                  placeholder="Add any notes about this assignment..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setShowEnvAssignModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUsersToEnvironment}
                disabled={envAssigning || envSelectedUsers.length === 0 || !selectedEnvironment}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {envAssigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                    Assigning...
                  </>
                ) : (
                  'Assign Users'
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ProjectAssignments;
