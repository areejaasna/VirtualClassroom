import axios from "axios";
import Constants from 'expo-constants'; // Expo Constants module
// It's often better to get the token from storage within the API functions
// or pass it explicitly, rather than relying on a global state import here.
// Let's assume the token is passed as an argument for better testability.
import AsyncStorage from '@react-native-async-storage/async-storage'; // To get token

// --- Base API URL ---
const { BACKEND_API } = Constants.expoConfig.extra;
const API_URL = `${BACKEND_API}api/users`;

// --- Axios Instance (Optional but Recommended for setting base URL and headers) ---
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to automatically add the token to headers
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken'); // Key used in authSlice? Check later
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json'; // Ensure content type
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// --- Register User ---
export const registerUser = async (userData) => {
  console.log("Registering user:", userData);
  // Using the base instance automatically adds base URL
  const response = await axiosInstance.post(`/register`, userData);
  return response.data;
};

// --- Login User ---
export const loginUser = async (credentials) => {
  console.log("Logging in user:", credentials.email);
  const response = await axiosInstance.post(`/login`, credentials);
  // Assuming login response includes the token, which is handled by authSlice
  return response.data;
};

// --- Get User Profile ---
export const getUserProfile = async () => {
  console.log("Fetching user profile...");
  // Token is added by the interceptor
  const response = await axiosInstance.get(`/profile`);
  console.log("Profile data received:", response.data);
  return response.data; // Expected format: { user: { ... } }
};

// --- Update User Profile ---
export const updateUserProfile = async (updateData) => {
  console.log("Updating profile with data:", updateData);
  // Token is added by the interceptor
  const response = await axiosInstance.put(`/profile/update`, updateData);
  console.log("Profile update response:", response.data);
  return response.data; // Expected format: { message: "...", user: { ... } }
};