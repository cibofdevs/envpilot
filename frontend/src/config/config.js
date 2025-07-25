// Configuration for the application
export const config = {
  // Backend API URL (without /api suffix for static files)
  API_BASE_URL: process.env.REACT_APP_API_URL ? 
    process.env.REACT_APP_API_URL.replace('/api', '') : 
    'http://localhost:9095',
  
  // WebSocket URL
  WS_URL: process.env.REACT_APP_WS_URL || 
    (process.env.REACT_APP_API_URL ? 
      process.env.REACT_APP_API_URL.replace('/api', '').replace('http', 'ws') : 
      'ws://localhost:9095'),
  
  // Get full URL for static files (like profile photos)
  getStaticFileUrl: (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path;
    return `${config.API_BASE_URL}${path}`;
  }
}; 