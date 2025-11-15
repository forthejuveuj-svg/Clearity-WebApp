// Circular dependency: B imports A
import { functionA } from './circular-a';

export function functionB() {
  return 'B';
}

export function functionC() {
  return 'C calls ' + functionA();
}
