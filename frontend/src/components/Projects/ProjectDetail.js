import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { HomeIcon, ServerIcon, DocumentTextIcon, Cog6ToothIcon, RocketLaunchIcon, UsersIcon } from '@heroicons/react/24/outline';
import { projectsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProjectOverview from './ProjectOverview';
import ProjectEnvironments from './ProjectEnvironments';
import ProjectDeployments from './ProjectDeployments';
import JenkinsConfig from './JenkinsConfig';
import JenkinsDeployment from './JenkinsDeployment';
import ProjectAssignments from './ProjectAssignments';
import StatusBadge from '../Common/StatusBadge';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async () => {
    try {
      const response = await projectsAPI.getById(id);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Project Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'The requested project could not be found.'}</p>
        <Link to="/projects" className="btn-primary">
          Back to Projects
        </Link>
      </div>
    );
  }

  const allTabs = [
    { name: 'Overview', component: ProjectOverview },
    { name: 'Environments', component: ProjectEnvironments },
    { name: 'Deployments', component: ProjectDeployments },
    { name: 'Assignments', component: ProjectAssignments, adminOnly: true },
    { name: 'Jenkins Config', component: JenkinsConfig, adminOnly: true },
    { name: 'Jenkins Deploy', component: JenkinsDeployment, adminOnly: true },
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/projects"
          className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Projects
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={project.status} size="sm" />
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group>
        <Tab.List className="relative flex space-x-1 rounded-xl bg-white dark:bg-gray-800 p-1 border border-blue-100 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab, idx) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold leading-5 transition-all duration-200 focus:outline-none',
                  selected
                    ? 'bg-primary-600 text-white shadow ring-2 ring-primary-400'
                    : 'bg-primary-50 dark:bg-gray-700 text-primary-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-600'
                )
              }
            >
              {tab.name === 'Overview' && <HomeIcon className="h-4 w-4" />}
              {tab.name === 'Environments' && <ServerIcon className="h-4 w-4" />}
              {tab.name === 'Deployments' && <DocumentTextIcon className="h-4 w-4" />}
              {tab.name === 'Assignments' && <UsersIcon className="h-4 w-4" />}
              {tab.name === 'Jenkins Config' && <Cog6ToothIcon className="h-4 w-4" />}
              {tab.name === 'Jenkins Deploy' && <RocketLaunchIcon className="h-4 w-4" />}
              {tab.name}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-6">
          {tabs.map((tab, idx) => (
            <Tab.Panel key={idx} className="focus:outline-none">
              {tab.name === 'Deployments' ? (
                <tab.component projectId={project.id} />
              ) : tab.name === 'Assignments' ? (
                <tab.component projectId={project.id} projectName={project.name} />
              ) : (
                <tab.component project={project} onUpdate={setProject} />
              )}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
