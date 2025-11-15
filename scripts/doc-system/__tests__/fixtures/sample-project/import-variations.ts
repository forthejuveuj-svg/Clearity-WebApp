// File with various import styles for testing

// Default import
import React from 'react';

// Named imports
import { useState, useEffect } from 'react';

// Namespace import
import * as path from 'path';

// Type-only import
import type { ReactNode } from 'react';

// Mixed import
import fs, { readFileSync } from 'fs';

// Side-effect import
import './styles.css';

// Re-export
export { Button } from './components/Button';
export * from './utils';

// Default export
export default function MainComponent() {
  return <div>Main</div>;
}

// Named exports
export const CONSTANT = 'value';
export function namedFunction() {
  return 'named';
}
