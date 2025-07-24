import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/api';
import UserWelcomeCard from './UserWelcomeCard';
import StatsCards from './StatsCards';
import RecentProjects from './RecentProjects';
import ActiveEnvironments from './ActiveEnvironments';
import BuildStatusLogs from './BuildStatusLogs';

export default function Dashboard() {
  const { user, token, loading: authLoading, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [environments, setEnvironments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch data if authentication is complete and user is authenticated
    if (authLoading || !user || !token) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch basic dashboard data
        const [statsRes, projectsRes, envsRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getRecentProjects(5),
          dashboardAPI.getActiveEnvironments(5)
        ]);
        
        setStats(statsRes.data);
        setProjects(projectsRes.data || []);
        setEnvironments(envsRes.data || []);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [authLoading, user, token]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Authentication Required</div>
          <p className="text-gray-600 mb-4">Please log in to access the dashboard.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Backend already filters data based on user role, so we can use the data directly
  const getFilteredEnvironments = () => {
    return environments;
  };

  const getFilteredProjects = () => {
    return projects;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <UserWelcomeCard />
      {stats && <StatsCards stats={stats} userRole={user?.role} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentProjects 
          projects={getFilteredProjects()} 
          isAdmin={isAdmin()} 
          userRole={user?.role}
        />
        <ActiveEnvironments 
          environments={getFilteredEnvironments()} 
          userRole={user?.role}
        />
      </div>
      <BuildStatusLogs />
    </div>
  );
}
