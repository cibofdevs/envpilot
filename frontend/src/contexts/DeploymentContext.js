import React, { createContext, useContext, useState, useCallback } from 'react';

const DeploymentContext = createContext();

export const useDeployment = () => {
  const context = useContext(DeploymentContext);
  if (!context) {
    throw new Error('useDeployment must be used within a DeploymentProvider');
  }
  return context;
};

export const DeploymentProvider = ({ children }) => {
  const [deploymentTriggers, setDeploymentTriggers] = useState(new Set());
  const [lastDeployment, setLastDeployment] = useState(null);

  // Function to trigger a deployment refresh
  const triggerDeploymentRefresh = useCallback((projectId) => {
    setDeploymentTriggers(prev => new Set([...prev, projectId]));
    
    // Clear the trigger after a short delay to prevent multiple refreshes
    setTimeout(() => {
      setDeploymentTriggers(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }, 1000);
  }, []);

  // Function to set the last deployment for immediate display
  const setLastDeploymentData = useCallback((deploymentData) => {
    setLastDeployment(deploymentData);
    
    // Clear the last deployment after a delay
    setTimeout(() => {
      setLastDeployment(null);
    }, 5000);
  }, []);

  // Function to check if a project needs deployment refresh
  const needsDeploymentRefresh = useCallback((projectId) => {
    return deploymentTriggers.has(projectId);
  }, [deploymentTriggers]);

  // Function to get the last deployment data
  const getLastDeployment = useCallback(() => {
    return lastDeployment;
  }, [lastDeployment]);

  const value = {
    triggerDeploymentRefresh,
    setLastDeploymentData,
    needsDeploymentRefresh,
    getLastDeployment
  };

  return (
    <DeploymentContext.Provider value={value}>
      {children}
    </DeploymentContext.Provider>
  );
}; 