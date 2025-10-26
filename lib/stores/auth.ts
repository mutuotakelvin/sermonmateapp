import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  credits: number;
  free_trial_used: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.post('/login', {
        email,
        password,
      });

      if (response.data.success) {
        const { user, token } = response.data;
        
        // Store token securely
        await SecureStore.setItemAsync('auth_token', token);
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, message: response.data.message };
      }
    } catch (error: any) {
      set({ isLoading: false });
      console.error('Login error:', error);
      
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        return { success: false, message: 'Network error. Please check your connection and try again.' };
      }
      
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  },

  register: async (name: string, email: string, password: string, passwordConfirmation: string) => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.post('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (response.data.success) {
        const { user, token } = response.data;
        
        // Store token securely
        await SecureStore.setItemAsync('auth_token', token);
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, message: response.data.message };
      }
    } catch (error: any) {
      set({ isLoading: false });
      console.error('Registration error:', error);
      
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        return { success: false, message: 'Network error. Please check your connection and try again.' };
      }
      
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  },

  logout: async () => {
    try {
      // Call logout endpoint
      await apiClient.post('/logout');
    } catch (error) {
      // Ignore logout errors
    }
    
    // Clear stored token
    await SecureStore.deleteItemAsync('auth_token');
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadUser: async () => {
    set({ isLoading: true });
    
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      
      if (token) {
        // Set token in axios headers
        apiClient.defaults.headers.Authorization = `Bearer ${token}`;
        
        // Fetch user data
        const response = await apiClient.get('/user');
        
        if (response.data.success) {
          set({
            user: response.data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Invalid token, clear it
          await SecureStore.deleteItemAsync('auth_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      // Error loading user, clear token
      await SecureStore.deleteItemAsync('auth_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (user: User) => {
    set({ user });
  },
}));
