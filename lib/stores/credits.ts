import { create } from 'zustand';
import apiClient from '../api';

export interface CreditPackage {
  id: number;
  name: string;
  sessions_count: number;
  price_usd: number;
  is_active: boolean;
}

interface CreditsState {
  packages: CreditPackage[];
  isLoading: boolean;
  
  // Actions
  fetchPackages: () => Promise<void>;
  initializePayment: (packageId: number) => Promise<{ success: boolean; data?: any; message?: string }>;
}

export const useCreditsStore = create<CreditsState>((set, get) => ({
  packages: [],
  isLoading: false,

  fetchPackages: async () => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.get('/credit-packages');
      
      if (response.data.success) {
        set({
          packages: response.data.packages,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch credit packages:', error);
      set({ isLoading: false });
    }
  },

  initializePayment: async (packageId: number) => {
    try {
      const response = await apiClient.post('/payments/initialize', {
        package_id: packageId,
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.data.message,
        };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Payment initialization failed';
      return {
        success: false,
        message,
      };
    }
  },
}));
