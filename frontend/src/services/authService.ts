import axios from 'axios';

// The URL of your Dockerized Django backend
const API_URL = 'http://localhost:8000/api/login/';

export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(API_URL, {
      email,
      password,
    });
    
    // If successful, we get 'access' and 'refresh' tokens
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  } catch (error: any) {
    // Throw error to be caught by the UI
    throw error.response?.data || "Login failed";
  }
};