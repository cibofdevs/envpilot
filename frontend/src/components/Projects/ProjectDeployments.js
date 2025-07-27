import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectsAPI, jenkinsAPI } from '../../services/api';
import { useDeployment } from '../../contexts/DeploymentContext';
import { config } from '../../config/config';
import notificationService from '../../services/notificationService';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PauseCircleIcon, QuestionMarkCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import DeploymentStatusBadge from '../Common/DeploymentStatusBadge';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const ProjectDeployments = ({ projectId }) => {
  const { needsDeploymentRefresh, getLastDeployment } = useDeployment();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [activeDeployments, setActiveDeployments] = useState(new Set());
  
  // STOMP WebSocket connection for real-time updates
  const wsConnection = useRef(null);
  const wsReconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const loadDeployments = useCallback(async () => {
    if (!projectId) {
      setError('Project ID not found.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await projectsAPI.getProjectDeployments(projectId);
      const fetchedDeployments = response.data;
      
      // Load active deployments from localStorage
      const storedActiveDeployments = localStorage.getItem(`activeDeployments_${projectId}`);
      let storedDeployments = [];
      if (storedActiveDeployments) {
        try {
          storedDeployments = JSON.parse(storedActiveDeployments);
        } catch (e) {
          console.error('Failed to parse stored active deployments:', e);
        }
      }
      
      // Merge fetched deployments with stored active deployments
      const mergedDeployments = [...fetchedDeployments];
      
      // Add stored active deployments that are not in fetched deployments
      storedDeployments.forEach(storedDeployment => {
        const exists = fetchedDeployments.find(d => d.id === storedDeployment.id);
        if (!exists && (storedDeployment.status === 'PENDING' || storedDeployment.status === 'IN_PROGRESS')) {
          mergedDeployments.unshift(storedDeployment); // Add to beginning
        }
      });
      
      // Add last deployment data if available and not already in the list
      const lastDeployment = getLastDeployment();
      if (lastDeployment && lastDeployment.project?.id === projectId) {
        // Check if we have a real deployment with the same version and build number
        const realDeployment = fetchedDeployments.find(d => 
          d.version === lastDeployment.version && 
          d.jenkinsBuildNumber === lastDeployment.jenkinsBuildNumber &&
          d.environment?.id === lastDeployment.environment?.id
        );
        
        if (realDeployment) {
          // Real deployment found, don't add temporary one
          console.log('✅ Real deployment found, skipping temporary deployment');
        } else {
          // No real deployment found yet, add temporary one
          const exists = mergedDeployments.find(d => d.id === lastDeployment.id);
          if (!exists) {
            mergedDeployments.unshift(lastDeployment); // Add to beginning
          }
        }
      }
      
      // Update active deployments set
      const newActiveDeployments = new Set();
      mergedDeployments.forEach(deployment => {
        if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
          newActiveDeployments.add(deployment.id);
        }
      });
      setActiveDeployments(newActiveDeployments);
      
      setDeployments(mergedDeployments);
    } catch (err) {
      setError('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, [projectId, getLastDeployment]);

  useEffect(() => {
    if (projectId) {
      loadDeployments();
    }
    
    // Cleanup function to remove active deployments from localStorage when component unmounts
    return () => {
      if (projectId) {
        // Only remove if there are no active deployments
        if (activeDeployments.size === 0) {
          localStorage.removeItem(`activeDeployments_${projectId}`);
        }
      }
    };
  }, [projectId, loadDeployments, activeDeployments.size]);

  // Check for new active deployments after initial load
  useEffect(() => {
    if (deployments.length > 0 && activeDeployments.size === 0) {
      // Check if there are any active deployments in the current list
      const hasActive = deployments.some(d => 
        d.status === 'PENDING' || d.status === 'IN_PROGRESS'
      );
      
      if (hasActive) {
        // Update active deployments set
        const newActiveDeployments = new Set();
        deployments.forEach(deployment => {
          if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
            newActiveDeployments.add(deployment.id);
          }
        });
        setActiveDeployments(newActiveDeployments);
        
        // Store in localStorage
        const activeDeploymentsToStore = deployments.filter(d => 
          d.status === 'PENDING' || d.status === 'IN_PROGRESS'
        );
        localStorage.setItem(`activeDeployments_${projectId}`, JSON.stringify(activeDeploymentsToStore));
      }
    }
  }, [deployments, activeDeployments.size, projectId]);

  // Effect to refresh deployments when triggered from other components
  useEffect(() => {
    if (projectId && needsDeploymentRefresh(projectId)) {
      console.log('🔄 Deployment refresh triggered for project:', projectId);
      loadDeployments();
    }
  }, [projectId, needsDeploymentRefresh, loadDeployments]);

  // Initialize STOMP WebSocket connection for real-time deployment updates
  const initWebSocket = useCallback(() => {
    // Check if we're in a Mixed Content situation
    const isMixedContent = window.location.protocol === 'https:' && config.WS_URL.startsWith('ws://');
    
    if (isMixedContent) {
      console.warn('WebSocket disabled due to Mixed Content: HTTPS frontend cannot connect to HTTP WebSocket');
      return;
    }

    if (!config.ENABLE_REAL_TIME_NOTIFICATIONS) {
      console.log('Real-time notifications disabled in config');
      return;
    }

    try {
      console.log('🔌 Initializing STOMP WebSocket connection for deployment updates...');
      console.log('   Current protocol:', window.location.protocol);
      console.log('   Config WS_URL:', config.WS_URL);
      console.log('   ENABLE_REAL_TIME_NOTIFICATIONS:', config.ENABLE_REAL_TIME_NOTIFICATIONS);
      
      // Convert WebSocket URL to HTTP/HTTPS for SockJS
      let wsUrl = config.WS_URL;
      if (wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'http://');
      } else if (wsUrl.startsWith('wss://')) {
        wsUrl = wsUrl.replace('wss://', 'https://');
      }
      
      console.log('   Final SockJS URL:', wsUrl + '/ws');
      console.log('   Original WS_URL:', config.WS_URL);
      
      // Create STOMP client with SockJS
      wsConnection.current = new Client({
        webSocketFactory: () => {
          console.log('🔌 Creating SockJS connection to:', wsUrl + '/ws');
          return new SockJS(wsUrl + '/ws');
        },
        debug: function (str) {
          console.log('STOMP Debug:', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        connectHeaders: {
          // Add any headers if needed for authentication
        }
      });
      
      wsConnection.current.onConnect = (frame) => {
        console.log('✅ STOMP WebSocket connected for deployment updates');
        console.log('   Connected to:', frame.headers.server);
        console.log('   Frame details:', frame);
        wsReconnectAttempts.current = 0;
        
        // Subscribe to deployment updates
        wsConnection.current.subscribe('/topic/deployments', (message) => {
          console.log('📨 STOMP message received:', message.body);
          try {
            const data = JSON.parse(message.body);
            console.log('📨 Parsed STOMP message:', data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Error parsing STOMP message:', error);
          }
        });
        
        console.log('📡 Subscribed to /topic/deployments');
      };
      
      wsConnection.current.onStompError = (frame) => {
        console.error('STOMP error:', frame);
        console.error('   Error details:', frame.body);
        console.error('   Error headers:', frame.headers);
      };
      
      wsConnection.current.onWebSocketError = (error) => {
        console.error('WebSocket error:', error);
        console.error('   Error type:', error.type);
        console.error('   Error target:', error.target);
      };
      
      wsConnection.current.onWebSocketClose = () => {
        console.log('❌ STOMP WebSocket disconnected for deployment updates');
        reconnectWebSocket();
      };
      
      // Connect to STOMP broker
      wsConnection.current.activate();
      
    } catch (error) {
      console.error('Failed to initialize STOMP WebSocket for deployment updates:', error);
      console.error('   Error details:', error.message);
      console.error('   Falling back to polling only');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle WebSocket messages for deployment status updates
  const handleWebSocketMessage = useCallback((data) => {
    console.log('📨 WebSocket message received:', data);
    
    // Handle different message types
    if (data.type === 'deployment_status_update') {
      console.log('🔄 Deployment status update received:', data);
      
      // Update the specific deployment in the list
      setDeployments(prevDeployments => {
        let updatedDeployments = [...prevDeployments];
        
        // First, try to find and update the real deployment
        const realDeploymentIndex = updatedDeployments.findIndex(d => d.id === data.deploymentId);
        
        if (realDeploymentIndex !== -1) {
          // Update existing real deployment
          console.log(`🔄 Updating real deployment ${data.deploymentId} status from ${updatedDeployments[realDeploymentIndex].status} to ${data.status}`);
          
          updatedDeployments[realDeploymentIndex] = {
            ...updatedDeployments[realDeploymentIndex],
            status: data.status,
            completedAt: data.timestamp
          };
        } else {
          // Look for temporary deployment with matching version and build number
          const tempDeploymentIndex = updatedDeployments.findIndex(d => 
            d.isTemporary && 
            d.version === data.version && 
            d.jenkinsBuildNumber === data.jenkinsBuildNumber
          );
          
          if (tempDeploymentIndex !== -1) {
            // Replace temporary deployment with real deployment data
            console.log(`🔄 Replacing temporary deployment with real deployment ${data.deploymentId}`);
            
            updatedDeployments[tempDeploymentIndex] = {
              id: data.deploymentId,
              version: data.version,
              status: data.status,
              environment: { name: data.environmentName },
              project: { name: data.projectName },
              triggeredBy: { name: data.triggeredBy },
              createdAt: data.timestamp,
              completedAt: data.timestamp,
              jenkinsBuildNumber: data.jenkinsBuildNumber,
              isTemporary: false
            };
          } else {
            // Add new deployment if not found
            console.log(`🔄 Adding new deployment ${data.deploymentId}`);
            updatedDeployments.unshift({
              id: data.deploymentId,
              version: data.version,
              status: data.status,
              environment: { name: data.environmentName },
              project: { name: data.projectName },
              triggeredBy: { name: data.triggeredBy },
              createdAt: data.timestamp,
              completedAt: data.timestamp,
              jenkinsBuildNumber: data.jenkinsBuildNumber,
              isTemporary: false
            });
          }
        }
        
        // Show notification for status changes
        const deployment = updatedDeployments.find(d => d.id === data.deploymentId);
        if (deployment && deployment.status === data.status) {
          if (data.status === 'SUCCESS') {
            notificationService.showSystemAlert(
              '🚀 Deployment Successful!',
              `Deployment of project '${data.projectName}' to ${data.environmentName} with version ${data.version} has been successfully completed in Jenkins`,
              'success'
            );
            
            // Remove from active deployments
            setActiveDeployments(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.deploymentId);
              return newSet;
            });
          } else if (data.status === 'FAILED') {
            notificationService.showSystemAlert(
              '❌ Deployment Failed',
              `Deployment of project '${data.projectName}' to ${data.environmentName} with version ${data.version} failed in Jenkins`,
              'error'
            );
            
            // Remove from active deployments
            setActiveDeployments(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.deploymentId);
              return newSet;
            });
          }
        }
        
        return updatedDeployments;
      });
    } else if (data.type === 'deployment') {
      // Handle legacy deployment notification format
      console.log('🔄 Legacy deployment notification received:', data);
      
      if (data.deployment && data.deployment.id) {
        setDeployments(prevDeployments => {
          let updatedDeployments = [...prevDeployments];
          
          // First, try to find and update the real deployment
          const realDeploymentIndex = updatedDeployments.findIndex(d => d.id === data.deployment.id);
          
          if (realDeploymentIndex !== -1) {
            // Update existing real deployment
            console.log(`🔄 Updating real deployment ${data.deployment.id} status from ${updatedDeployments[realDeploymentIndex].status} to ${data.deployment.status}`);
            
            updatedDeployments[realDeploymentIndex] = {
              ...updatedDeployments[realDeploymentIndex],
              ...data.deployment
            };
          } else {
            // Look for temporary deployment with matching version and build number
            const tempDeploymentIndex = updatedDeployments.findIndex(d => 
              d.isTemporary && 
              d.version === data.deployment.version && 
              d.jenkinsBuildNumber === data.deployment.jenkinsBuildNumber
            );
            
            if (tempDeploymentIndex !== -1) {
              // Replace temporary deployment with real deployment data
              console.log(`🔄 Replacing temporary deployment with real deployment ${data.deployment.id}`);
              
              updatedDeployments[tempDeploymentIndex] = {
                ...data.deployment,
                isTemporary: false
              };
            } else {
              // Add new deployment if not found
              console.log(`🔄 Adding new deployment ${data.deployment.id}`);
              updatedDeployments.unshift({
                ...data.deployment,
                isTemporary: false
              });
            }
          }
          
          // Show notification for status changes
          const deployment = updatedDeployments.find(d => d.id === data.deployment.id);
          if (deployment && deployment.status === data.deployment.status) {
            if (data.deployment.status === 'SUCCESS') {
              notificationService.showSystemAlert(
                '🚀 Deployment Successful!',
                `Deployment of project '${data.deployment.project?.name || 'Unknown'}' to ${data.deployment.environment?.name || 'Unknown'} with version ${data.deployment.version} has been successfully completed in Jenkins`,
                'success'
              );
              
              // Remove from active deployments
              setActiveDeployments(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.deployment.id);
                return newSet;
              });
            } else if (data.deployment.status === 'FAILED') {
              notificationService.showSystemAlert(
                '❌ Deployment Failed',
                `Deployment of project '${data.deployment.project?.name || 'Unknown'}' to ${data.deployment.environment?.name || 'Unknown'} with version ${data.deployment.version} failed in Jenkins`,
                'error'
              );
              
              // Remove from active deployments
              setActiveDeployments(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.deployment.id);
                return newSet;
              });
            }
          }
          
          return updatedDeployments;
        });
      }
    } else {
      console.log('📨 Unknown WebSocket message type:', data.type);
    }
  }, []);

  // Reconnect WebSocket with exponential backoff
  const reconnectWebSocket = useCallback(() => {
    if (wsReconnectAttempts.current < maxReconnectAttempts) {
      wsReconnectAttempts.current++;
      console.log(`🔄 Attempting STOMP WebSocket reconnection ${wsReconnectAttempts.current}/${maxReconnectAttempts}...`);
      
      setTimeout(() => {
        initWebSocket();
      }, reconnectDelay * Math.pow(2, wsReconnectAttempts.current - 1));
    } else {
      console.error('❌ Max STOMP WebSocket reconnection attempts reached');
    }
  }, [initWebSocket]);

  // Initialize STOMP WebSocket on component mount
  useEffect(() => {
    initWebSocket();
    
    // Cleanup STOMP WebSocket on component unmount
    return () => {
      if (wsConnection.current) {
        wsConnection.current.deactivate();
        wsConnection.current = null;
      }
    };
  }, [initWebSocket]);

  const handleRefresh = async () => {
    if (!projectId) return;
    try {
      setRefreshing(true);
      
      // Force sync all deployments from Jenkins first
      console.log('🔄 Force syncing all deployments from Jenkins...');
      await jenkinsAPI.syncAllDeployments();
      
      // Then fetch updated deployment list
      const response = await projectsAPI.getProjectDeployments(projectId);
      const fetchedDeployments = response.data;
      
      // Load active deployments from localStorage
      const storedActiveDeployments = localStorage.getItem(`activeDeployments_${projectId}`);
      let storedDeployments = [];
      if (storedActiveDeployments) {
        try {
          storedDeployments = JSON.parse(storedActiveDeployments);
        } catch (e) {
          console.error('Failed to parse stored active deployments:', e);
        }
      }
      
      // Merge fetched deployments with stored active deployments
      const mergedDeployments = [...fetchedDeployments];
      
      // Add stored active deployments that are not in fetched deployments
      storedDeployments.forEach(storedDeployment => {
        const exists = fetchedDeployments.find(d => d.id === storedDeployment.id);
        if (!exists && (storedDeployment.status === 'PENDING' || storedDeployment.status === 'IN_PROGRESS')) {
          // Check if this is a temporary deployment that should be replaced
          if (storedDeployment.isTemporary) {
            const realDeployment = fetchedDeployments.find(d => 
              d.version === storedDeployment.version && 
              d.jenkinsBuildNumber === storedDeployment.jenkinsBuildNumber &&
              d.environment?.id === storedDeployment.environment?.id
            );
            
            if (realDeployment) {
              // Real deployment found, don't add temporary one
              console.log('✅ Real deployment found in refresh, skipping temporary deployment');
            } else {
              // No real deployment found yet, keep temporary one
              mergedDeployments.unshift(storedDeployment);
            }
          } else {
            // Not a temporary deployment, add it
            mergedDeployments.unshift(storedDeployment);
          }
        }
      });
      
      // Update active deployments set
      const newActiveDeployments = new Set();
      mergedDeployments.forEach(deployment => {
        if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
          newActiveDeployments.add(deployment.id);
        }
      });
      setActiveDeployments(newActiveDeployments);
      
      setDeployments(mergedDeployments);
      
      // Show success notification
      notificationService.showSystemAlert(
        'Deployment History Updated',
        'Deployment history has been refreshed successfully',
        'success'
      );
    } catch (err) {
      setError('Failed to refresh deployments');
      notificationService.showSystemAlert(
        'Refresh Failed',
        'Failed to refresh deployment history',
        'error'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Fallback polling for deployment status changes (reduced frequency since we have WebSocket)
  useEffect(() => {
    const checkDeploymentStatus = async () => {
      if (!projectId) return;
      try {
        // Only sync if WebSocket is not available
        if (!wsConnection.current || !wsConnection.current.connected) {
          console.log('🔄 WebSocket not available, using fallback polling...');
          await jenkinsAPI.syncAllDeployments();
        }
        
        // Fetch updated deployment list as fallback
        const response = await projectsAPI.getProjectDeployments(projectId);
        const newDeployments = response.data;
        
        // Merge with current deployments to preserve active ones
        const currentDeployments = [...deployments];
        const updatedDeployments = [...newDeployments];
        
        // Add current active deployments that are not in new deployments
        currentDeployments.forEach(currentDeployment => {
          if ((currentDeployment.status === 'PENDING' || currentDeployment.status === 'IN_PROGRESS') &&
              !newDeployments.find(d => d.id === currentDeployment.id)) {
            // Check if this is a temporary deployment that should be replaced
            if (currentDeployment.isTemporary) {
              const realDeployment = newDeployments.find(d => 
                d.version === currentDeployment.version && 
                d.jenkinsBuildNumber === currentDeployment.jenkinsBuildNumber &&
                d.environment?.id === currentDeployment.environment?.id
              );
              
              if (realDeployment) {
                // Real deployment found, don't add temporary one
                console.log('✅ Real deployment found in polling, skipping temporary deployment');
              } else {
                // No real deployment found yet, keep temporary one
                updatedDeployments.unshift(currentDeployment);
              }
            } else {
              // Not a temporary deployment, add it
              updatedDeployments.unshift(currentDeployment);
            }
          }
        });
        
        // Update active deployments set
        const newActiveDeployments = new Set();
        updatedDeployments.forEach(deployment => {
          if (deployment.status === 'PENDING' || deployment.status === 'IN_PROGRESS') {
            newActiveDeployments.add(deployment.id);
          }
        });
        setActiveDeployments(newActiveDeployments);
        
        // Store active deployments in localStorage
        const activeDeploymentsToStore = updatedDeployments.filter(d => 
          d.status === 'PENDING' || d.status === 'IN_PROGRESS'
        );
        localStorage.setItem(`activeDeployments_${projectId}`, JSON.stringify(activeDeploymentsToStore));
        
        setDeployments(updatedDeployments);
      } catch (err) {
        console.error('Failed to check deployment status:', err);
        // Don't show error to user for background sync operations
        // Only log for debugging purposes
      }
    };

    // More aggressive polling when WebSocket is not connected
    const interval = setInterval(checkDeploymentStatus, 5000); // 5 seconds for faster updates
    return () => clearInterval(interval);
  }, [deployments, projectId, activeDeployments]);

  // Auto-refresh deployment history every 120 seconds as fallback (reduced frequency)
  // This runs independently of the monitoring to provide fallback updates
  useEffect(() => {
    const autoRefreshDeployments = async () => {
      if (!projectId) return;
      try {
        console.log('🔄 Auto-refreshing deployment history for project:', projectId);
        const response = await projectsAPI.getProjectDeployments(projectId);
        const fetchedDeployments = response.data;
        
        // Merge with current deployments to preserve active ones
        const currentDeployments = [...deployments];
        const updatedDeployments = [...fetchedDeployments];
        
        // Add current active deployments that are not in fetched deployments
        currentDeployments.forEach(currentDeployment => {
          if ((currentDeployment.status === 'PENDING' || currentDeployment.status === 'IN_PROGRESS') &&
              !fetchedDeployments.find(d => d.id === currentDeployment.id)) {
            updatedDeployments.unshift(currentDeployment);
          }
        });
        
        setDeployments(updatedDeployments);
      } catch (err) {
        console.error('Failed to auto-refresh deployment history:', err);
      }
    };

    // Auto-refresh every 120 seconds (reduced from 60)
    const interval = setInterval(autoRefreshDeployments, 120000);
    return () => clearInterval(interval);
  }, [projectId, deployments]);

  // Pagination logic
  const totalPages = Math.ceil(deployments.length / pageSize);
  const paginatedDeployments = deployments.slice((page - 1) * pageSize, page * pageSize);

      // Helper to create page number array with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Show max 7 page numbers
    
    if (totalPages <= maxVisiblePages) {
      // If total pages is less than max visible, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate the range of pages to show
      let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust start page if we're near the end
      if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - maxVisiblePages + 1);
      }
      
      // Add first page if not in range
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // Add pages in the calculated range
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add last page if not in range
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    return <DeploymentStatusBadge status={status} size="sm" />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'PENDING':
        return <PauseCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />;
      default:
        return <QuestionMarkCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />;
    }
  };

  // Function to manually sync a specific deployment
  const handleManualSync = async (deploymentId) => {
    try {
      console.log('🔄 Manually syncing deployment:', deploymentId);
      await jenkinsAPI.syncDeploymentRealtime(deploymentId);
      
      // Refresh the deployment list after manual sync
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    } catch (error) {
      console.error('Failed to manually sync deployment:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Deployment History</h3>
        <div className="flex items-center space-x-2">
          {/* STOMP WebSocket connection status indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${wsConnection.current && wsConnection.current.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {wsConnection.current && wsConnection.current.connected ? 'Connected' : 'Disconnected'}
            </span>
            {wsConnection.current && (
              <span className="text-xs text-gray-400">
                ({wsConnection.current.connected ? 'STOMP' : 'WebSocket'})
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Refresh deployment history"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              console.log('🔄 Manual WebSocket reconnect requested');
              if (wsConnection.current) {
                wsConnection.current.deactivate();
                setTimeout(() => {
                  initWebSocket();
                }, 1000);
              } else {
                initWebSocket();
              }
            }}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Reconnect WebSocket"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Reconnect
          </button>
        </div>
      </div>

      {deployments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No deployments found for this project.</p>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {paginatedDeployments.map((deployment) => (
            <div
              key={deployment.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(deployment.status)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Version {deployment.version}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Environment: {deployment.environment.name}
                    </p>
                    {(deployment.jenkinsBuildNumber || deployment.buildNumber) ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Build #{deployment.jenkinsBuildNumber || deployment.buildNumber}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Build #... (waiting for Jenkins)
                      </p>
                    )}
                    
                    {/* Manual sync button for stuck deployments */}
                    {deployment.status === 'PENDING' && deployment.jenkinsBuildNumber && (
                      <button
                        onClick={() => handleManualSync(deployment.id)}
                        className="mt-2 inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        title="Force sync status from Jenkins"
                      >
                        <ArrowPathIcon className="h-3 w-3 mr-1" />
                        Sync Status
                      </button>
                    )}
                    {deployment.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Notes: {deployment.notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {getStatusBadge(deployment.status)}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(deployment.createdAt).toLocaleString()}
                  </p>
                  {deployment.completedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Completed: {new Date(deployment.completedAt).toLocaleString()}
                    </p>
                  )}
                  {deployment.completedAt && deployment.createdAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Duration: {Math.round((new Date(deployment.completedAt) - new Date(deployment.createdAt)) / 1000 / 60)}m
                    </p>
                  )}
                </div>
              </div>
              
              {deployment.triggeredBy && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Triggered by: {deployment.triggeredBy.name}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Pagination Controls with numbers */}
        <div className="flex flex-col items-center mt-4 space-y-2">
          {/* Page info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages} • {deployments.length} deployments total
          </div>
          {/* Pagination buttons */}
          <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
         {getPageNumbers().map((num, index) => (
           <React.Fragment key={index}>
             {num === '...' ? (
               <span className="px-2 py-1 text-gray-500 dark:text-gray-400 font-medium">
                 ...
               </span>
             ) : (
               <button
                 onClick={() => setPage(num)}
                 className={`px-3 py-1 rounded font-medium ${
                   num === page 
                     ? 'bg-primary-600 text-white' 
                     : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900'
                 }`}
               >
                 {num}
               </button>
             )}
           </React.Fragment>
         ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Next
          </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ProjectDeployments;
