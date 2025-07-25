import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { QrCodeIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import ErrorModal from '../Common/ErrorModal';
import { authAPI } from '../../services/api';
import QRCode from 'react-qr-code';

const MfaSetup = ({ tempToken, onComplete }) => {
  const [step, setStep] = useState(1); // 1: QR Code, 2: Verification, 3: Backup Codes
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  const { completeMfaSetup } = useAuth();
  const { currentTheme } = useTheme();

  const setupMfa = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAPI.setupMfa(tempToken);

      if (response.data.success) {
        
        setQrCodeUrl(response.data.qrCodeUrl);
        setSecret(response.data.secret);
        setBackupCodes(response.data.backupCodes);
      } else {
        setError('Failed to setup MFA');
        setShowErrorModal(true);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Network error occurred');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, [tempToken]);

  useEffect(() => {
    setupMfa();
  }, [setupMfa]);

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.enableMfa({
        code: parseInt(verificationCode)
      }, tempToken);

      if (response.status === 200) {
        setStep(3); // Show backup codes
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

  const handleComplete = async () => {
    try {
      // Get the final user data from the backend
      const response = await authAPI.getMfaStatus(tempToken);
      const userData = response.data;
      
      console.log('MFA setup completed, final user data:', userData);
      
      // Complete MFA setup (this will handle localStorage and state)
      completeMfaSetup(userData);
      
      // Navigate to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error getting final user data:', error);
      // Fallback: just complete setup and navigate
      completeMfaSetup({});
      window.location.href = '/dashboard';
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setError('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading && step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Setting up MFA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <QrCodeIcon className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Setup Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Secure your account with 2FA
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
              </p>
              
              {qrCodeUrl && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-center">
                  <QRCode 
                    value={qrCodeUrl} 
                    size={250}
                    level="M"
                    bgColor={currentTheme === 'dark' ? '#1f2937' : '#ffffff'}
                    fgColor={currentTheme === 'dark' ? '#ffffff' : '#000000'}
                  />
                </div>
              )}

              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Or enter this code manually:</p>
                <div className="flex items-center justify-center space-x-2">
                  <code className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-sm font-mono text-gray-900 dark:text-gray-100">
                    {showSecret ? secret : '••••••••••••••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showSecret ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(secret)}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
            >
              Next: Verify Code
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Step 2: Verify Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>
              
              <input
                type="text"
                maxLength="6"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 text-center text-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="000000"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
              >
                Back
              </button>
              <button
                onClick={handleVerification}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Step 3: Backup Codes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device:
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 text-center font-mono text-sm text-gray-900 dark:text-gray-100">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⚠️ Each code can only be used once. Generate new codes if you run out.
              </p>
            </div>

            <button
              onClick={handleComplete}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
            >
              Complete Setup
            </button>
          </div>
        )}
      </div>

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        title="MFA Setup Error"
        message={error}
        onClose={closeErrorModal}
      />
    </div>
  );
};

export default MfaSetup; 