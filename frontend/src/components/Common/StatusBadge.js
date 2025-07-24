import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArchiveBoxIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const StatusBadge = ({ status, size = 'sm', variant = 'default' }) => {
  const getStatusConfig = (status) => {
    const configs = {
      ACTIVE: {
        icon: CheckCircleIcon,
        text: 'Active',
        default: {
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-800',
          iconClasses: 'text-emerald-500 dark:text-emerald-200'
        },
        solid: {
          classes: 'bg-emerald-600 text-white border-emerald-600',
          iconClasses: 'text-emerald-100'
        },
        outline: {
          classes: 'bg-transparent text-emerald-700 border-emerald-300 dark:text-emerald-200 dark:border-emerald-700',
          iconClasses: 'text-emerald-600 dark:text-emerald-200'
        }
      },
      INACTIVE: {
        icon: ExclamationTriangleIcon,
        text: 'Inactive',
        default: {
          classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800',
          iconClasses: 'text-amber-500 dark:text-amber-200'
        },
        solid: {
          classes: 'bg-amber-600 text-white border-amber-600',
          iconClasses: 'text-amber-100'
        },
        outline: {
          classes: 'bg-transparent text-amber-700 border-amber-300 dark:text-amber-200 dark:border-amber-700',
          iconClasses: 'text-amber-600 dark:text-amber-200'
        }
      },
      ARCHIVED: {
        icon: ArchiveBoxIcon,
        text: 'Archived',
        default: {
          classes: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700',
          iconClasses: 'text-gray-500 dark:text-gray-300'
        },
        solid: {
          classes: 'bg-gray-600 text-white border-gray-600',
          iconClasses: 'text-gray-100'
        },
        outline: {
          classes: 'bg-transparent text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-700',
          iconClasses: 'text-gray-600 dark:text-gray-300'
        }
      },
      PENDING: {
        icon: ClockIcon,
        text: 'Pending',
        default: {
          classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800',
          iconClasses: 'text-blue-500 dark:text-blue-200'
        },
        solid: {
          classes: 'bg-blue-600 text-white border-blue-600',
          iconClasses: 'text-blue-100'
        },
        outline: {
          classes: 'bg-transparent text-blue-700 border-blue-300 dark:text-blue-200 dark:border-blue-700',
          iconClasses: 'text-blue-600 dark:text-blue-200'
        }
      },
      FAILED: {
        icon: XCircleIcon,
        text: 'Failed',
        default: {
          classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
          iconClasses: 'text-red-500 dark:text-red-200'
        },
        solid: {
          classes: 'bg-red-600 text-white border-red-600',
          iconClasses: 'text-red-100'
        },
        outline: {
          classes: 'bg-transparent text-red-700 border-red-300 dark:text-red-200 dark:border-red-700',
          iconClasses: 'text-red-600 dark:text-red-200'
        }
      }
    };
    
    const statusConfig = configs[status] || configs.ACTIVE;
    return {
      icon: statusConfig.icon,
      text: statusConfig.text,
      ...statusConfig[variant] || statusConfig.default
    };
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
      <IconComponent className={`${iconSizes[size]} ${config.iconClasses}`} />
      <span>{config.text || status}</span>
    </span>
  );
};

export default StatusBadge; 