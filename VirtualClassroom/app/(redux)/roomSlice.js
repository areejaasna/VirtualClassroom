import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../(services)/api/api';


const initialState = {
  roomName: null,
  roomId: null,
  videoCall: null,
  users: [],
};


export const getRoom = createAsyncThunk(
  'room/getRoom',
  async (roomId, { dispatch }) => {
    const response = await api.get(`/api/conference/rooms/${roomId}`);
    
    return response.data;
  }
);


const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    joinRoom: (state, action) => {
      state.roomName = action.payload;
    },
    setRoomId: (state, action) => {
      state.roomId = action.payload;
    },
    leaveRoom: (state) => {
      state.roomName = null;
      state.roomId = null;
      state.videoCall = null;
      state.users = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getRoom.fulfilled, (state, action) => {
      state.users = action.payload.users;
      state.videoCall = action.payload.videoCall;
    }
  },
});

export const { joinRoom, leaveRoom, setRoomId } = roomSlice.actions;
export default roomSlice.reducer;
