import apiClient from './api';

/**
 * Test API connection - useful for debugging
 * Call this function to test if the API is reachable
 */
export async function testApiConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing API connection...');
    
    // Try to hit a simple endpoint (like the user endpoint with no auth)
    // Or we can create a health check endpoint
    // For now, let's try the login endpoint with invalid credentials to see if we get a 401 (which means API is reachable)
    
    const response = await apiClient.post('/login', {
      email: 'test@test.com',
      password: 'test123456',
    });
    
    return {
      success: true,
      message: 'API is reachable',
      details: response.data,
    };
  } catch (error: any) {
    // If we get a 401, that's actually good - it means the API is reachable
    if (error.response?.status === 401) {
      return {
        success: true,
        message: 'API is reachable (got 401 as expected for invalid credentials)',
        details: {
          status: 401,
          message: 'Invalid credentials (expected)',
        },
      };
    }
    
    // If we get a 422, that's also fine - validation error means API is reachable
    if (error.response?.status === 422) {
      return {
        success: true,
        message: 'API is reachable (got 422 validation error)',
        details: {
          status: 422,
          message: 'Validation error (expected)',
        },
      };
    }
    
    // Any other error means there's a problem
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'API connection failed',
      details: {
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
        message: error.message,
      },
    };
  }
}

/**
 * Get current API configuration
 */
export function getApiConfig() {
  return {
    baseURL: apiClient.defaults.baseURL,
    timeout: apiClient.defaults.timeout,
    headers: apiClient.defaults.headers,
  };
}

