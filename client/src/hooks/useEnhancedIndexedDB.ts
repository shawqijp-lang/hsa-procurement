/**
 * 🗄️ Enhanced IndexedDB Hook - Hook محسن للتعامل مع IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';

export function useEnhancedIndexedDB() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        await enhancedIndexedDB.init();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize IndexedDB');
        console.error('IndexedDB initialization failed:', err);
      }
    };

    initDB();
  }, []);

  const saveData = useCallback(async (key: string, value: any, type?: 'auth' | 'data' | 'credentials' | 'settings') => {
    try {
      await enhancedIndexedDB.setItem(key, value, type);
      return true;
    } catch (err) {
      console.error('Error saving to IndexedDB:', err);
      return false;
    }
  }, []);

  const getData = useCallback(async (key: string) => {
    try {
      return await enhancedIndexedDB.getItem(key);
    } catch (err) {
      console.error('Error reading from IndexedDB:', err);
      return null;
    }
  }, []);

  const removeData = useCallback(async (key: string) => {
    try {
      await enhancedIndexedDB.removeItem(key);
      return true;
    } catch (err) {
      console.error('Error removing from IndexedDB:', err);
      return false;
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await enhancedIndexedDB.clear();
      return true;
    } catch (err) {
      console.error('Error clearing IndexedDB:', err);
      return false;
    }
  }, []);

  const saveAuthData = useCallback(async (key: string, value: any) => {
    return saveData(key, value, 'auth');
  }, [saveData]);

  const getAuthData = useCallback(async (key: string) => {
    return getData(key);
  }, [getData]);

  const saveCredentials = useCallback(async (credentials: any) => {
    return saveData('offline_credentials', credentials, 'credentials');
  }, [saveData]);

  const getCredentials = useCallback(async () => {
    return getData('offline_credentials');
  }, [getData]);

  return {
    isInitialized,
    error,
    saveData,
    getData,
    removeData,
    clearAll,
    saveAuthData,
    getAuthData,
    saveCredentials,
    getCredentials,
  };
}

export default useEnhancedIndexedDB;