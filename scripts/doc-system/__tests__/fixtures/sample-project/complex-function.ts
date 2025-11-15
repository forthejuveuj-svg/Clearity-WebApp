// Function with known cyclomatic complexity for testing

export function complexFunction(x: number, y: number, z: string): string {
  // Complexity: 5
  if (x > 0) { // +1
    if (y > 0) { // +1
      return 'both positive';
    } else if (y < 0) { // +1
      return 'x positive, y negative';
    }
  } else if (x < 0) { // +1
    return 'x negative';
  }
  
  switch (z) { // +3 (3 cases)
    case 'a':
      return 'case a';
    case 'b':
      return 'case b';
    case 'c':
      return 'case c';
    default:
      return 'default';
  }
}

export function simpleFunction(a: number): number {
  // Complexity: 1 (no branches)
  return a * 2;
}
