import React, { useState } from 'react';
import { RocketLaunchIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import JenkinsConfig from './JenkinsConfig';
import JenkinsDeployment from './JenkinsDeployment';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const isJenkinsConfigured = (project) =>
  project.jenkinsUrl && project.jenkinsJobName && project.jenkinsUsername && project.jenkinsToken;

export default function JenkinsPanel({ project, onUpdate }) {
  const [view, setView] = useState(isJenkinsConfigured(project) ? 'deploy' : 'config');

  const sections = [
    { key: 'deploy', label: 'Deploy', icon: RocketLaunchIcon },
    { key: 'config', label: 'Configuration', icon: Cog6ToothIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg bg-gray-100 dark:bg-white/5 p-1">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setView(section.key)}
            className={classNames(
              'inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              view === section.key
                ? 'bg-white dark:bg-primary-900/60 text-primary-700 dark:text-primary-200 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      {view === 'deploy' ? (
        <JenkinsDeployment project={project} />
      ) : (
        <JenkinsConfig project={project} onUpdate={onUpdate} />
      )}
    </div>
  );
}
