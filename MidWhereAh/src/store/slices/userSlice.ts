/**
 * User profile state slice
 * Manages user preferences and profile data
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferredTransportMode: 'TRANSIT' | 'WALKING' | 'DRIVING' | 'CYCLING';
  homeLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  workLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  preferences: {
    maxTravelTime: number; // minutes
    equityWeight: number; // 0-1, importance of equity vs efficiency
    notifications: boolean;
    darkMode: boolean;
  };
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserProfile['preferences']>>) => {
      if (state.profile) {
        state.profile.preferences = { ...state.profile.preferences, ...action.payload };
      }
    },
    setHomeLocation: (state, action: PayloadAction<{ lat: number; lng: number; address?: string }>) => {
      if (state.profile) {
        state.profile.homeLocation = action.payload;
      }
    },
    setWorkLocation: (state, action: PayloadAction<{ lat: number; lng: number; address?: string }>) => {
      if (state.profile) {
        state.profile.workLocation = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
});

export const {
  setProfile,
  updateProfile,
  updatePreferences,
  setHomeLocation,
  setWorkLocation,
  setLoading,
  setError,
  clearProfile,
} = userSlice.actions;

export default userSlice.reducer;