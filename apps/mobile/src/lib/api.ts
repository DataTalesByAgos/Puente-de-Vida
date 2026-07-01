import { createApiClient } from '@pdv/shared';
import { getToken } from './auth';
import Constants from 'expo-constants';

const baseUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000';

export const api = createApiClient({
  baseUrl,
  getToken,
});
