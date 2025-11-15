// File with various unused imports for testing
import { useState, useEffect } from 'react'; // useEffect is unused
import * as fs from 'fs'; // Entire namespace import unused
import type { ReactNode } from 'react'; // Type import unused
import defaultExport from './some-module'; // Default import unused
import { namedExport1, namedExport2 } from './another-module'; // namedExport2 unused

export function TestComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <p>Using: {namedExport1}</p>
    </div>
  );
}
