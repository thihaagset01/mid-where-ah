/**
 * Venues state slice
 * Manages venue data and recommendations
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Venue {
  id: string;
  name: string;
  category: string;
  coordinate: {
    lat: number;
    lng: number;
  };
  address: string;
  rating?: number;
  priceLevel?: number;
  openingHours?: string[];
  photos?: string[];
  equityScore?: number;
  averageTravelTime?: number;
}

interface VenuesState {
  venues: Venue[];
  recommendations: Venue[];
  selectedVenue: Venue | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: VenuesState = {
  venues: [],
  recommendations: [],
  selectedVenue: null,
  searchQuery: '',
  isLoading: false,
  error: null,
};

const venuesSlice = createSlice({
  name: 'venues',
  initialState,
  reducers: {
    setVenues: (state, action: PayloadAction<Venue[]>) => {
      state.venues = action.payload;
    },
    addVenue: (state, action: PayloadAction<Venue>) => {
      state.venues.push(action.payload);
    },
    setRecommendations: (state, action: PayloadAction<Venue[]>) => {
      state.recommendations = action.payload;
    },
    setSelectedVenue: (state, action: PayloadAction<Venue | null>) => {
      state.selectedVenue = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearVenues: (state) => {
      state.venues = [];
      state.recommendations = [];
      state.selectedVenue = null;
      state.error = null;
    },
  },
});

export const {
  setVenues,
  addVenue,
  setRecommendations,
  setSelectedVenue,
  setSearchQuery,
  setLoading,
  setError,
  clearVenues,
} = venuesSlice.actions;

export default venuesSlice.reducer;