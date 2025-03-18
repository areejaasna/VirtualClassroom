import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import roomReducer from './roomSlice';  // Import the roomReducer

const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,  // Add the room reducer
  },
});

export default store;
