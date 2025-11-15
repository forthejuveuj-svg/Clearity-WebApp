// File with unused functions for testing

// Exported but never used
export function unusedExportedFunction() {
  return 'This is never called';
}

// Not exported, not used
function unusedInternalFunction() {
  return 'This is also never called';
}

// Used function
export function usedFunction() {
  return helperFunction();
}

// Helper function used internally
function helperFunction() {
  return 'I am used';
}

// Unused arrow function
const unusedArrowFunction = () => {
  return 'Arrow function unused';
};

// Used arrow function
export const usedArrowFunction = () => {
  return 'Arrow function used';
};
