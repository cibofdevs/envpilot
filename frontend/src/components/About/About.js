import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { 
  RocketLaunchIcon, 
  GlobeAltIcon, 
  UsersIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  EnvelopeIcon,
  UserGroupIcon,
  KeyIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const About = () => {
  const { appName, appVersion } = useApp();
  const currentYear = new Date().getFullYear();

  const features = [
    {
      icon: RocketLaunchIcon,
      title: 'Multi-Environment Deployment',
      description: 'Streamline deployments across development, staging, and production environments with automated workflows and real-time build monitoring.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Environment Management',
      description: 'Centralized management of environment configurations, feature flags, and deployment variables with role-based access control.'
    },
    {
      icon: UsersIcon,
      title: 'Role-Based Access Control',
      description: 'Granular access control with Admin, Developer, and QA roles for secure deployment management and user assignments.'
    },
    {
      icon: UserGroupIcon,
      title: 'Project & Environment Assignments',
      description: 'Assign users to specific projects and environments with custom roles and permissions for enhanced team collaboration.'
    },
    {
      icon: KeyIcon,
      title: 'Feature Flags & Configurations',
      description: 'Manage feature flags and environment-specific configurations with admin-only access for sensitive settings.'
    },
    {
      icon: EyeIcon,
      title: 'Real-time Build Logs',
      description: 'Monitor deployment progress with real-time build logs and Jenkins integration for immediate feedback.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Security & Authentication',
      description: 'Enterprise-grade security with JWT authentication, MFA support, and role-based authorization.'
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics & Monitoring',
      description: 'Comprehensive analytics dashboard for deployment trends, performance metrics, and system insights with admin-only access.'
    },
    {
      icon: Cog6ToothIcon,
      title: 'CI/CD Integration',
      description: 'Seamless integration with Jenkins and other CI/CD tools for automated deployment pipelines and build management.'
    },
    {
      icon: BellIcon,
      title: 'Real-time Notifications',
      description: 'Instant notifications for deployment status, system alerts, and important events with customizable preferences.'
    },
    {
      icon: EnvelopeIcon,
      title: 'Email Alerts',
      description: 'Configurable email notifications for deployment success, failures, and critical system events.'
    },
    {
      icon: WrenchScrewdriverIcon,
      title: 'System Settings',
      description: 'Centralized system configuration management with feature toggles and application-wide settings control.'
    }
  ];

  const techStack = [
    { 
      category: 'Backend', 
      items: [
        'Spring Boot 3.x', 
        'Spring Security', 
        'Spring Data JPA', 
        'PostgreSQL', 
        'JWT Authentication',
        'MFA Support',
        'Flyway Migrations',
        'RESTful APIs'
      ] 
    },
    { 
      category: 'Frontend', 
      items: [
        'React 18', 
        'Tailwind CSS', 
        'Axios', 
        'React Router', 
        'Heroicons',
        'Dark Mode Support',
        'React Portal',
        'Context API'
      ] 
    },
    { 
      category: 'DevOps & Tools', 
      items: [
        'Jenkins Integration', 
        'Docker Support', 
        'SMTP Email', 
        'Swagger Documentation',
        'Real-time Logs',
        'Build Monitoring',
        'Environment Variables',
        'Feature Flags'
      ] 
    }
  ];

  const recentUpdates = [
    {
      icon: UserGroupIcon,
      title: 'User Assignment System',
      description: 'Enhanced user management with project and environment assignments, role-based permissions, and team collaboration features.'
    },
    {
      icon: EyeIcon,
      title: 'Real-time Build Monitoring',
      description: 'Live build logs and deployment status tracking with Jenkins integration for immediate feedback and troubleshooting.'
    },
    {
      icon: KeyIcon,
      title: 'Admin-Only Features',
      description: 'Restricted access to sensitive features like analytics, feature flags, and configurations for enhanced security.'
    },
    {
      icon: CheckCircleIcon,
      title: 'Improved UI/UX',
      description: 'Enhanced modal overlays, better z-index management, and improved user experience across all components.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">About {appName}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {appName} is a modern, comprehensive platform designed to simplify and streamline 
            multi-environment deployment management with advanced analytics, security, automation capabilities, 
            and real-time monitoring features.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {appName} was built to address the growing complexity of managing multiple projects 
            across diverse environments. We believe that deployment management should be intuitive, 
            secure, and provide actionable insights for continuous improvement. Our platform 
            empowers teams to deploy with confidence while maintaining full visibility and control 
            over their deployment processes, with enhanced collaboration through user assignments 
            and real-time monitoring capabilities.
          </p>
        </div>

        {/* Recent Updates */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Recent Updates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentUpdates.map((update, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <update.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{update.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{update.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
                <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {techStack.map((stack, index) => (
              <div key={index}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{stack.category}</h3>
                <ul className="space-y-2">
                  {stack.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-gray-600 dark:text-gray-300 flex items-center">
                      <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-3"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Version & Copyright */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Version Information</h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p><span className="font-medium">Current Version:</span> {appVersion}</p>
                <p><span className="font-medium">Release Date:</span> January 2025</p>
                <p><span className="font-medium">License:</span> MIT License</p>
                <p><span className="font-medium">Framework:</span> Spring Boot + React</p>
                <p><span className="font-medium">Last Updated:</span> January 2025</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contact & Links</h3>
              <div className="space-y-2">
                <a 
                  href="https://github.com/cibofdevs/envpilot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 block"
                >
                  GitHub Repository
                </a>
                <a 
                  href="https://github.com/cibofdevs/envpilot/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 block"
                >
                  Report Issues
                </a>
                <a 
                  href="https://github.com/cibofdevs/envpilot/blob/main/README.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 block"
                >
                  Documentation
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>© {currentYear} {appName}. All rights reserved.</p>
          <p className="mt-1">Built with ❤️ by the EnvPilot Team</p>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About; 