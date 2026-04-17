import { describe, expect, it, } from '@jest/globals';
import { getBenefitCardDefaultDetailsExpanded, } from '../benefitCard';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toBe(expected: boolean): void;
};

describeTest('benefitCard', () => {
  itTest('keeps the benefit description collapsed on mobile first load', () => {
    expectValue(getBenefitCardDefaultDetailsExpanded(true,),).toBe(false,);
  },);

  itTest('keeps the benefit description collapsed on larger screens too', () => {
    expectValue(getBenefitCardDefaultDetailsExpanded(false,),).toBe(false,);
  },);
},);
