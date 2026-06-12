import { createSlice } from '@reduxjs/toolkit';

interface BookingState {
  bookings: any[];
  currentBooking: any | null;
  isLoading: boolean;
}

const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  isLoading: false,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setBookings: (state, action) => {
      state.bookings = action.payload;
    },
    setCurrentBooking: (state, action) => {
      state.currentBooking = action.payload;
    },
  },
});

export const { setBookings, setCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
