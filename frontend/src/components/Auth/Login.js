import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import ErrorModal from '../Common/ErrorModal';
import MfaVerification from './MfaVerification';
import MfaSetup from './MfaSetup';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { 
    login, 
    mfaRequired, 
    mfaSetupRequired, 
    tempToken, 
    completeMfaLogin, 
    completeMfaSetup,
    user,
    token
  } = useAuth();

  const { currentTheme } = useTheme();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    console.log('Login useEffect triggered:', { user: !!user, token: !!token, mfaRequired, mfaSetupRequired });
    
    if (user && token && !mfaRequired && !mfaSetupRequired) {
      console.log('User already logged in, redirecting to dashboard');
      // Use window.location to prevent infinite loops
      if (window.location.pathname !== '/dashboard') {
        window.location.href = '/dashboard';
      }
    }
  }, [user, token, mfaRequired, mfaSetupRequired]); // Remove navigate from dependencies

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required.');
      setShowErrorModal(true);
      return false;
    }
    if (!formData.password.trim()) {
      setError('Password is required.');
      setShowErrorModal(true);
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Invalid email format.');
      setShowErrorModal(true);
      return false;
    }
    if (formData.password.length < 1) {
      setError('Password is required.');
      setShowErrorModal(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowErrorModal(false);

    // Check if user is already logged in
    if (user && token) {
      console.log('User already logged in, redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    console.log('Form submitted with data:', formData);
    const result = await login(formData);
    console.log('Login result:', result);
    
    if (result.success) {
      console.log('Login successful, navigating to dashboard');
      window.location.href = '/dashboard';
    } else if (result.requiresMfa) {
      console.log('MFA verification required');
      // MFA verification will be handled by the component state
    } else if (result.requiresMfaSetup) {
      console.log('MFA setup required');
      // MFA setup will be handled by the component state
    } else {
      console.log('Login failed:', result.error);
      setError(result.error);
      setShowErrorModal(true);
    }
    
    setLoading(false);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setError('');
  };

  // Show MFA verification if required
  if (mfaRequired && tempToken) {
    console.log('Showing MFA verification component');
    return (
      <MfaVerification 
        tempToken={tempToken} 
        onComplete={completeMfaLogin} 
      />
    );
  }

  // Show MFA setup if required
  if (mfaSetupRequired && tempToken) {
    console.log('Showing MFA setup component');
    return (
      <MfaSetup 
        tempToken={tempToken} 
        onComplete={completeMfaSetup} 
      />
    );
  }

  // If user is already logged in, show loading or redirect
  if (user && token) {
    console.log('User already logged in, showing loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <img 
              src="/logo.svg" 
              alt="EnvPilot Logo" 
              className="h-12 w-12"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Sign in to EnvPilot
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Multi-Project Environment Manager
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        title="Login Failed"
        message={error}
        onClose={closeErrorModal}
      />
    </div>
  );
}
