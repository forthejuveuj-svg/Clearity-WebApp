// File with mixed logic - multiple unrelated entities

import { useState } from 'react';

// Database utility
export function connectToDatabase(connectionString: string) {
  console.log('Connecting to:', connectionString);
  return { connected: true };
}

// React component
export function UserProfile({ name }: { name: string }) {
  const [isVisible, setIsVisible] = useState(true);
  
  return isVisible ? <div>User: {name}</div> : null;
}

// String utility
export function capitalizeString(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// API client
export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async fetchData(endpoint: string) {
    return fetch(`${this.baseUrl}${endpoint}`);
  }
}

// Math utility
export function calculatePercentage(value: number, total: number): number {
  return (value / total) * 100;
}
