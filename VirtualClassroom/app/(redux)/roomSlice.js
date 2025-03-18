import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  roomId: null,  // Default state for the roomId
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoomId: (state, action) => {
      state.roomId = action.payload;  // Set the roomId to the payload value
    },
    clearRoomId: (state) => {
      state.roomId = null;  // Clear the roomId
    },
  },
});

export const { setRoomId, clearRoomId } = roomSlice.actions;
export default roomSlice.reducer;
