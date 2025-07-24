import React from 'react';

const TrendsChart = ({ data, dateRange }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Simple bar chart implementation using CSS
  const renderBarChart = (chartData, title, color = 'blue') => {
    if (!chartData || Object.keys(chartData).length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No data available for {title.toLowerCase()}
        </div>
      );
    }

    // Handle different data structures
    let entries = [];
    if (Array.isArray(chartData)) {
      // If chartData is an array of objects
      entries = chartData.map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          // Handle object with userName and deploymentCount
          if (item.userName && item.deploymentCount !== undefined) {
            return [item.userName, item.deploymentCount];
          }
          // Handle other object structures
          const keys = Object.keys(item);
          if (keys.length > 0) {
            return [keys[0], item[keys[0]]];
          }
        }
        return [`Item ${index}`, item];
      });
    } else {
      // If chartData is an object
      entries = Object.entries(chartData);
    }

    // Filter out invalid entries and ensure values are numbers
    entries = entries.filter(([, value]) => {
      if (typeof value === 'object' && value !== null) {
        return false; // Skip object values
      }
      return typeof value === 'number' || !isNaN(Number(value));
    });

    if (entries.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No valid data available for {title.toLowerCase()}
        </div>
      );
    }

    const maxValue = Math.max(...entries.map(([, value]) => Number(value)));
    
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
        <div className="space-y-2">
          {entries.slice(0, 10).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-3">
              <div className="w-20 text-xs text-gray-600 dark:text-gray-400 truncate" title={key}>
                {String(key)}
              </div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                <div
                  className={`bg-${color}-500 h-4 rounded-full transition-all duration-500`}
                  style={{ width: `${maxValue > 0 ? (Number(value) / maxValue) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="w-8 text-xs text-gray-900 dark:text-gray-100 font-medium">
                {Number(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Trends Over Last {dateRange} Days
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Project Creation Trends */}
          <div>
            {renderBarChart(data.projectCreationTrends, 'Project Creation', 'blue')}
          </div>
          
          {/* Deployment Frequency */}
          <div>
            {renderBarChart(data.deploymentFrequency, 'Deployment Frequency', 'green')}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Project Status Distribution</h4>
          {data.projectStatusDistribution ? (
            <div className="space-y-3">
              {Object.entries(data.projectStatusDistribution).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status.toLowerCase()}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${data.totalProjects > 0 ? (count / data.totalProjects) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">No status data available</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Deployment Status Distribution</h4>
          {data.deploymentStatusDistribution ? (
            <div className="space-y-3">
              {Object.entries(data.deploymentStatusDistribution).map(([status, count]) => {
                const getStatusColor = (status) => {
                  switch (status.toLowerCase()) {
                    case 'success': return 'bg-green-500';
                    case 'failed': return 'bg-red-500';
                    case 'in_progress': return 'bg-yellow-500';
                    case 'pending': return 'bg-gray-500';
                    default: return 'bg-blue-500';
                  }
                };
                
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {status.replace('_', ' ').toLowerCase()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`${getStatusColor(status)} h-2 rounded-full`}
                          style={{ 
                            width: `${data.totalDeployments > 0 ? (count / data.totalDeployments) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">No deployment data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendsChart;
