/**
 * 🔐 Offline Authentication Hook - Hook للمصادقة في وضع عدم الاتصال
 */

import { useState, useCallback } from 'react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';

export function useOfflineAuth() {
  const [isOffline] = useState(() => !navigator.onLine);

  const saveUserCredentials = useCallback(async (username: string, password: string, userData: any) => {
    try {
      const credentials = {
        username,
        password,
        fullName: userData.fullName,
        role: userData.role,
        companyId: userData.companyId,
        timestamp: Date.now()
      };

      await enhancedIndexedDB.saveCredentials(credentials);
      await enhancedIndexedDB.saveAuthData('user_data', userData);
      return true;
    } catch (error) {
      console.error('Failed to save offline credentials:', error);
      return false;
    }
  }, []);

  const validateOfflineLogin = useCallback(async (username: string, password: string) => {
    try {
      const storedCredentials = await enhancedIndexedDB.getCredentials();
      const userData = await enhancedIndexedDB.getAuthData('user_data');
      const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                    await enhancedIndexedDB.getAuthData('token');

      if (storedCredentials && userData && token) {
        if (storedCredentials.username === username && storedCredentials.password === password) {
          return { userData, token };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to validate offline login:', error);
      return null;
    }
  }, []);

  const clearOfflineData = useCallback(async () => {
    try {
      await enhancedIndexedDB.removeItem('offline_credentials');
      await enhancedIndexedDB.removeItem('user_data');
      await enhancedIndexedDB.removeItem('auth_token');
      await enhancedIndexedDB.removeItem('token');
      return true;
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      return false;
    }
  }, []);

  const getOfflineUserData = useCallback(async () => {
    try {
      const userData = await enhancedIndexedDB.getAuthData('user_data');
      const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                    await enhancedIndexedDB.getAuthData('token');
      return { userData, token };
    } catch (error) {
      console.error('Failed to get offline user data:', error);
      return { userData: null, token: null };
    }
  }, []);

  return {
    isOffline,
    saveUserCredentials,
    validateOfflineLogin,
    clearOfflineData,
    getOfflineUserData,
  };
}

export default useOfflineAuth;