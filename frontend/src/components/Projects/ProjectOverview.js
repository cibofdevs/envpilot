import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { projectsAPI } from '../../services/api';
import StatusBadge from '../Common/StatusBadge';

// Add ModalPortal component
function ModalPortal({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

export default function ProjectOverview({ project, onUpdate }) {
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await projectsAPI.update(project.id, editForm);
      onUpdate(response.data);
      setShowEditModal(false);
      alert('Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Failed to update project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await projectsAPI.delete(project.id);
      alert('Project deleted successfully!');
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Project Information */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Project Information</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEditForm({
                  name: project.name,
                  description: project.description || '',
                  status: project.status
                });
                setShowEditModal(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-white/10 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-800/60 shadow-sm text-sm leading-4 font-medium rounded-lg text-red-700 dark:text-red-300 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{project.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <div className="mt-1">
              <StatusBadge status={project.status} size="sm" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {project.description || 'No description provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Details</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Owner</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{project.owner?.name} ({project.owner?.email})</p>
            </div>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Created</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(project.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Last Updated</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(project.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="card relative top-20 mx-auto p-6 w-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Edit Project</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={editForm.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="input-field"
                    placeholder="Enter project description..."
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={editForm.status}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
            <div className="card relative top-20 mx-auto p-6 w-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Delete Project</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400 mr-4" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                    Are you sure you want to delete <strong>{project.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This action cannot be undone. All environments, deployments, and configurations will be permanently deleted.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
