import { useState, useCallback } from 'react';
import { useToast } from '../components/Common/Toast';

export const useApiWithLoading = () => {
  const [loading, setLoading] = useState(false);
  const { showLoading, hideLoading, showError, showSuccess } = useToast();

  const executeApiCall = useCallback(async (apiCall, loadingMessage = 'Memuat data...', showSuccessMessage = false) => {
    try {
      setLoading(true);
      showLoading(loadingMessage);
      
      const result = await apiCall();
      
      if (showSuccessMessage) {
        showSuccess('Operation completed successfully');
      }
      
      return result;
    } catch (error) {
      console.error('API Error:', error);
      
      let errorMessage = 'An error occurred while processing the request';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle timeout errors khusus
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Connection timeout - the database is slow, please try again';
      }
      
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
      hideLoading();
    }
  }, [showLoading, hideLoading, showError, showSuccess]);

  return {
    loading,
    executeApiCall
  };
}; 