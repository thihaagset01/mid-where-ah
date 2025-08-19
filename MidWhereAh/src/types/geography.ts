// src/types/geography.ts
export interface Coordinate {
    lat: number;
    lng: number;
  }
  
  export interface MRTStation {
    id: string;
    name: string;
    coordinate: Coordinate;
    lines: string[];
    isInterchange: boolean;
  }
  
  export interface Route {
    duration: number;
    distance: number;
    steps: RouteStep[];
  }
  
  export interface RouteStep {
    instruction: string;
    distance: number;
    duration: number;
    coordinate: Coordinate;
  }
  
  export interface BoundingBox {
    north: number;
    south: number;
    east: number;
    west: number;
  }