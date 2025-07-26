import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ToastProvider } from './components/Common/Toast';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './components/Auth/Login';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ProjectsList from './components/Projects/ProjectsList';
import ProjectDetail from './components/Projects/ProjectDetail';
import ProjectForm from './components/Projects/ProjectForm';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import UsersDashboard from './components/Users/UsersDashboard';
import SettingsDashboard from './components/Settings/SettingsDashboard';
import About from './components/About/About';
import systemAlertService from './services/systemAlertService';
import notificationService from './services/notificationService';
import { useAuth } from './contexts/AuthContext';
import { config } from './config/config';

// Initialize theme function
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  
  // Apply theme based on saved preference or system preference
  if (savedTheme) {
    if (savedTheme === 'auto') {
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(savedTheme);
    }
  } else {
    // Default to system preference
    root.classList.add(prefersDark ? 'dark' : 'light');
  }
};

// Theme Provider Component
const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Initialize theme immediately
    initializeTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'auto' || !savedTheme) {
        initializeTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return <>{children}</>;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Layout>
              <ProjectsList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <ProtectedRoute>
            <Layout>
              <ProjectForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <ProjectDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredRole={['Admin']}>
            <Layout>
              <AnalyticsDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <UsersDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <Layout>
              <About />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Log application info in debug mode
    if (config.DEBUG_MODE) {
      console.log(`${config.APP_NAME} v${config.APP_VERSION} initialized`);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('API URL:', config.API_BASE_URL);
      console.log('WebSocket URL:', config.WS_URL);
      console.log('Feature Flags:', {
        MFA: config.ENABLE_MFA,
        RealTimeNotifications: config.ENABLE_REAL_TIME_NOTIFICATIONS,
        Analytics: config.ENABLE_ANALYTICS
      });
    }

    // Initialize notification services
    const initializeNotifications = async () => {
      try {
        // Request notification permission on app start
        await notificationService.requestPermission();
        
        // Start system monitoring if enabled
        if (config.ENABLE_REAL_TIME_NOTIFICATIONS) {
          systemAlertService.startSystemMonitoring();
        }
        
        // Show welcome notification if enabled
        if (notificationService.isEnabled()) {
          setTimeout(() => {
            systemAlertService.showInfo(
              `Welcome to ${config.APP_NAME}`,
              'System notifications are now active. You can manage preferences in Settings.'
            );
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };
    
    initializeNotifications();
    
    // Cleanup on unmount
    return () => {
      systemAlertService.stopSystemMonitoring();
      notificationService.disconnect();
    };
  }, []);

  return (
    <ToastProvider>
      <PreferencesProvider>
        <AuthProvider>
          <AppProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ThemeProvider>
                <AppRoutes />
              </ThemeProvider>
            </Router>
          </AppProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ToastProvider>
  );
}

export default App;
