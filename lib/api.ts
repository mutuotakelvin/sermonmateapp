import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Production API URL - hardcoded to ensure it works in preview builds
const PRODUCTION_API_URL = 'https://sermonmate.bobakdevs.com/api/v1';

// Get API URL - prioritize env var, but always fallback to production URL
// This ensures preview builds work even if env vars aren't set
const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // If env var is set and not undefined/null/empty, use it
  if (envUrl && envUrl !== 'undefined' && envUrl.trim() !== '') {
    return envUrl;
  }
  
  // Otherwise, use production URL
  return PRODUCTION_API_URL;
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (helpful for debugging)
console.log('=== API Configuration ===');
console.log('__DEV__:', __DEV__);
console.log('EXPO_PUBLIC_API_URL env var:', process.env.EXPO_PUBLIC_API_URL);
console.log('Using API Base URL:', API_BASE_URL);
console.log('=======================');

if (!API_BASE_URL || API_BASE_URL === 'undefined') {
  console.error('ERROR: API_BASE_URL is not set! This will cause network errors.');
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add request logging with detailed information
apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
    
    // Enhanced logging for debugging
    console.log('═══════════════════════════════════════');
    console.log('📤 API REQUEST');
    console.log('═══════════════════════════════════════');
    console.log('Method:', config.method?.toUpperCase());
    console.log('Full URL:', fullUrl);
    console.log('Base URL:', config.baseURL);
    console.log('Path:', config.url);
    console.log('Headers:', JSON.stringify(config.headers, null, 2));
    if (config.data && (config.method === 'post' || config.method === 'put')) {
      // Don't log password in plain text
      const safeData = { ...config.data };
      if (safeData.password) {
        safeData.password = '***HIDDEN***';
      }
      console.log('Request payload:', JSON.stringify(safeData, null, 2));
    }
    console.log('═══════════════════════════════════════');
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      baseURL: error.config?.baseURL,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('═══════════════════════════════════════');
    console.log('✅ API RESPONSE SUCCESS');
    console.log('═══════════════════════════════════════');
    console.log('Status:', response.status);
    console.log('URL:', response.config.url);
    const fullUrl = response.config.baseURL 
      ? `${response.config.baseURL}${response.config.url}` 
      : response.config.url;
    console.log('Full URL:', fullUrl);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('═══════════════════════════════════════');
    return response;
  },
  async (error) => {
    const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${error.config?.url}` : error.config?.url;
    
    console.error('═══════════════════════════════════════');
    console.error('❌ API RESPONSE ERROR');
    console.error('═══════════════════════════════════════');
    console.error('Status:', error.response?.status || 'NO RESPONSE');
    console.error('Status Text:', error.response?.statusText || 'N/A');
    console.error('Full URL:', fullUrl);
    console.error('Base URL:', error.config?.baseURL);
    console.error('Path:', error.config?.url);
    console.error('Method:', error.config?.method?.toUpperCase());
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Request Headers:', JSON.stringify(error.config?.headers, null, 2));
    console.error('═══════════════════════════════════════');
    
    // Handle network errors specifically
    if (!error.response) {
      console.error('🌐 NETWORK ERROR - No response received');
      console.error('Possible causes:');
      console.error('1. API URL incorrect:', error.config?.baseURL);
      console.error('2. Device not connected to internet');
      console.error('3. Backend server not accessible');
      console.error('4. CORS issue');
      console.error('5. SSL/TLS certificate issue');
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      await SecureStore.deleteItemAsync('auth_token');
      console.error('🔐 Authentication failed - token cleared');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
