import React from 'react';
import { 
  SignalIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const EnvironmentStatusBadge = ({ status, size = 'sm' }) => {
  const getStatusConfig = (status) => {
    const configs = {
      ONLINE: {
        icon: SignalIcon,
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-800',
        iconClasses: 'text-emerald-500 dark:text-emerald-200',
        animation: 'animate-pulse',
        text: 'Online'
      },
      OFFLINE: {
        icon: SignalSlashIcon,
        classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
        iconClasses: 'text-red-500 dark:text-red-200',
        animation: '',
        text: 'Offline'
      },
      DEPLOYING: {
        icon: ArrowPathIcon,
        classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800',
        iconClasses: 'text-amber-500 dark:text-amber-200',
        animation: 'animate-spin',
        text: 'Deploying'
      },
      ERROR: {
        icon: ExclamationTriangleIcon,
        classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
        iconClasses: 'text-red-500 dark:text-red-200',
        animation: '',
        text: 'Error'
      }
    };
    
    return configs[status] || configs.OFFLINE;
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm'
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium border
      ${config.classes}
      ${sizeClasses[size]}
      transition-all duration-200 hover:shadow-sm
    `}>
      <IconComponent className={`${iconSizes[size]} ${config.iconClasses} ${config.animation}`} />
      <span>{config.text || status}</span>
    </span>
  );
};

export default EnvironmentStatusBadge; 