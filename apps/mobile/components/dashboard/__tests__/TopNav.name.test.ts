import { describe, expect, it, } from '@jest/globals';
import { getFirstName, } from '../userDisplayName';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: unknown): void;
};

describeTest('getFirstName', () => {
  itTest('returns the first token from a display name', () => {
    expectValue(getFirstName('Edward Calderon',),).toBe('Edward',);
  },);

  itTest('returns the full single-word name unchanged', () => {
    expectValue(getFirstName('Edward',),).toBe('Edward',);
  },);

  itTest('falls back to Account for blank names', () => {
    expectValue(getFirstName('   ',),).toBe('Account',);
    expectValue(getFirstName(undefined,),).toBe('Account',);
  },);
},);
