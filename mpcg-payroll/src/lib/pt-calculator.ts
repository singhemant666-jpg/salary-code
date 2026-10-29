// ============================================================
// Maharashtra Professional Tax (PT) Calculator
// ============================================================

import { isDoctorProfession } from './salary-calculator';

/**
 * Calculates Maharashtra Professional Tax (PT) based on gender, gross salary, and month.
 *
 * Rules (Maharashtra PT Act):
 * - Female Employees:
 *   - Gross Salary <= ₹25,000: ₹0 (NIL)
 *   - Gross Salary > ₹25,000: ₹200/month (₹300 in February)
 * - Male / Other Employees:
 *   - Gross Salary <= ₹7,500: ₹0 (NIL)
 *   - Gross Salary ₹7,501 to ₹10,000: ₹175/month
 *   - Gross Salary > ₹10,000: ₹200/month (₹300 in February)
 */
export function calculateProfessionalTax(
  gender: string | null | undefined,
  grossSalary: number,
  month: number
): number {
  const g = (gender || '').trim().toUpperCase();
  const isFemale = g === 'FEMALE';

  if (isFemale) {
    if (grossSalary <= 25000) {
      return 0;
    }
    return month === 2 ? 300 : 200;
  } else {
    if (grossSalary <= 7500) {
      return 0;
    } else if (grossSalary <= 10000) {
      return 175;
    } else {
      return month === 2 ? 300 : 200;
    }
  }
}

/**
 * Checks if a deduction line item represents Professional Tax (PT)
 */
export function isProfessionalTax(name: string): boolean {
  const n = (name || '').toLowerCase().trim();
  return (
    n.includes('professional tax') ||
    n.includes('p.t') ||
    n === 'pt' ||
    n === 'ptax' ||
    n === 'prof tax' ||
    n.includes('prof. tax')
  );
}

/**
 * Resolves the amount for a custom deduction item.
 * If the item is Professional Tax:
 * - Returns 0 if PT is waived.
 * - Returns 0 if employee is a Doctor in profession where TDS is deducted.
 * - Otherwise evaluates PT according to Maharashtra slabs.
 * For other custom items, returns the default value.
 */
export function getCustomDeductionAmount(
  item: { name: string; defaultValue: number | string; enabled: boolean },
  gender: string | null | undefined,
  grossSalary: number,
  month: number,
  options?: {
    designation?: string | null;
    isTdsDeducted?: boolean;
    isPtWaived?: boolean;
  }
): number {
  if (!item.enabled) return 0;
  if (isProfessionalTax(item.name)) {
    if (options?.isPtWaived) return 0;
    if (isDoctorProfession(options?.designation) && Boolean(options?.isTdsDeducted)) {
      return 0;
    }
    return calculateProfessionalTax(gender, grossSalary, month);
  }
  return Number(item.defaultValue || 0);
}
