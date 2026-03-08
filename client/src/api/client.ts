import axios, { type AxiosInstance } from 'axios';
import { getAuthCredentials } from '../utils/storage';

export const BASE_URL = 'https://scribe.prakhar.app';

export const createApiClient = async (): Promise<AxiosInstance> => {
  const credentials = await getAuthCredentials();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(credentials && {
        username: credentials.username,
        keyphrase: credentials.keyphrase,
      }),
    },
  });
};

export const createApiClientWithCreds = (username: string, keyphrase: string): AxiosInstance => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      username,
      keyphrase,
    },
  });
};
