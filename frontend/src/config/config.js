// Configuration for the application
export const config = {
  // Backend API URL
  API_BASE_URL: process.env.REACT_APP_API_URL,
  
  // WebSocket URL
  WS_URL: process.env.REACT_APP_WS_URL,
  
  // Application Configuration
  APP_NAME: process.env.REACT_APP_APP_NAME,
  APP_VERSION: process.env.REACT_APP_APP_VERSION,
  
  // Feature Flags
  ENABLE_MFA: process.env.REACT_APP_ENABLE_MFA === 'true',
  ENABLE_REAL_TIME_NOTIFICATIONS: process.env.REACT_APP_ENABLE_REAL_TIME_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  
  // Timeout Configuration
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT),
  API_RETRY_COUNT: parseInt(process.env.REACT_APP_API_RETRY_COUNT),
  API_RETRY_DELAY: parseInt(process.env.REACT_APP_API_RETRY_DELAY),
  
  // Development Configuration
  DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true',
  LOG_LEVEL: process.env.REACT_APP_LOG_LEVEL,
  
  // Get full URL for static files (like profile photos)
  getStaticFileUrl: (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path;
    const baseUrl = config.API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  },
  
  // Get API URL without /api suffix for static files
  getApiBaseUrl: () => {
    return config.API_BASE_URL.replace('/api', '');
  },
  
  // Check if running in development mode
  isDevelopment: () => {
    return process.env.NODE_ENV === 'development';
  },
  
  // Check if running in production mode
  isProduction: () => {
    return process.env.NODE_ENV === 'production';
  }
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    'REACT_APP_API_URL',
    'REACT_APP_WS_URL',
    'REACT_APP_APP_NAME',
    'REACT_APP_APP_VERSION',
    'REACT_APP_API_TIMEOUT',
    'REACT_APP_API_RETRY_COUNT',
    'REACT_APP_API_RETRY_DELAY',
    'REACT_APP_LOG_LEVEL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('Please check your .env file and ensure all required variables are set.');
    console.error('You can copy .env.example to .env and modify the values as needed.');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate numeric values
  const numericVars = [
    { name: 'REACT_APP_API_TIMEOUT', value: process.env.REACT_APP_API_TIMEOUT },
    { name: 'REACT_APP_API_RETRY_COUNT', value: process.env.REACT_APP_API_RETRY_COUNT },
    { name: 'REACT_APP_API_RETRY_DELAY', value: process.env.REACT_APP_API_RETRY_DELAY }
  ];

  const invalidNumericVars = numericVars.filter(({ name, value }) => {
    const numValue = parseInt(value);
    return isNaN(numValue) || numValue <= 0;
  });

  if (invalidNumericVars.length > 0) {
    console.error('❌ Invalid numeric environment variables:', invalidNumericVars.map(v => v.name));
    throw new Error(`Invalid numeric environment variables: ${invalidNumericVars.map(v => v.name).join(', ')}`);
  }

  console.log('✅ All required environment variables are properly configured');
};

// Run validation when config is imported
validateConfig(); 