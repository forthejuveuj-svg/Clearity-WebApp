// Circular dependency: A imports B
import { functionB } from './circular-b';

export function functionA() {
  return 'A calls ' + functionB();
}
