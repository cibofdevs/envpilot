import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Use window.location instead of Navigate to prevent infinite loops
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (requiredRole) {
    const userRole = user?.role;
    const hasAccess = Array.isArray(requiredRole) 
      ? requiredRole.some(role => {
          // Handle both 'Admin' and 'ADMIN' formats
          const normalizedRole = role.toUpperCase();
          return userRole === normalizedRole;
        })
      : userRole === requiredRole.toUpperCase();

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Required role: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your role: {userRole}</p>
          </div>
        </div>
      );
    }
  }

  return children;
}
