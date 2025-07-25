import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import ErrorModal from '../Common/ErrorModal';
import { authAPI } from '../../services/api';

const MfaVerification = ({ tempToken, onComplete }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { completeMfaLogin, resetMfaState } = useAuth();

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.verifyMfa({
        code: parseInt(verificationCode)
      }, tempToken);

      if (response.status === 200) {
        const data = response.data;
        console.log('MFA verification successful, data:', data);
        
        // Complete MFA login (this will handle localStorage and state)
        completeMfaLogin(data);
        
        // Small delay to ensure state is updated before navigation
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
        
        return; // Exit early to prevent any further processing
      } else {
        setError('Invalid verification code');
        setShowErrorModal(true);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Network error occurred');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setError('');
  };

  const handleBackToLogin = () => {
    // Clear all temporary data
    localStorage.removeItem('tempToken');
    localStorage.removeItem('tempEmail');
    resetMfaState();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <ShieldCheckIcon className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We've sent a verification code to your authenticator app. Please enter it below:
            </p>
            
            <input
              type="text"
              maxLength="6"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 text-center text-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="000000"
              autoFocus
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleBackToLogin}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
            >
              Back to Login
            </button>
            <button
              onClick={handleVerification}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Don't have access to your authenticator app? Contact your administrator for assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        title="Verification Error"
        message={error}
        onClose={closeErrorModal}
      />
    </div>
  );
};

export default MfaVerification; 