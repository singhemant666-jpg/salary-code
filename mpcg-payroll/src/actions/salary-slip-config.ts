'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface CustomLineItem {
  id: string;
  name: string;
  defaultValue: number | string;
  enabled: boolean;
}

export interface SalarySlipLayoutConfig {
  companyName: string;
  slipTitle: string;
  noteText: string;
  showHeaderLogo: boolean;
  showSignatures: boolean;
  showHra: boolean;
  showConveyance: boolean;
  showIncentive: boolean;
  showOvertime: boolean;
  showPfDeduction: boolean;
  showAdvanceDeduction: boolean;
  showLoanDeduction: boolean;
  sig1Label: string;
  sig2Label: string;
  sig3Label: string;
  sig4Label: string;
  customEarnings?: CustomLineItem[];
  customDeductions?: CustomLineItem[];
}

const defaultConfig: SalarySlipLayoutConfig = {
  companyName: 'MY PAIN CLINIC GLOBAL',
  slipTitle: 'SALARY SLIP',
  noteText: 'This is a computer-generated salary slip. PF is not included in this salary structure.',
  showHeaderLogo: true,
  showSignatures: false,
  showHra: true,
  showConveyance: true,
  showIncentive: true,
  showOvertime: true,
  showPfDeduction: false,
  showAdvanceDeduction: true,
  showLoanDeduction: true,
  sig1Label: 'Employee Signature',
  sig2Label: 'Prepared By',
  sig3Label: 'Checked By',
  sig4Label: 'Authorized Signature',
  customEarnings: [],
  customDeductions: [],
};

export async function getSalarySlipLayoutConfig(): Promise<SalarySlipLayoutConfig> {
  try {
    const setting = await prisma.payrollSetting.findUnique({
      where: { key: 'salary_slip_layout_config' },
    });

    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return {
          ...defaultConfig,
          ...parsed,
          customEarnings: Array.isArray(parsed.customEarnings) ? parsed.customEarnings : [],
          customDeductions: Array.isArray(parsed.customDeductions) ? parsed.customDeductions : [],
        };
      } catch (parseErr) {
        console.warn('Corrupted layout JSON in database, resetting to default:', parseErr);
      }
    }
  } catch (error) {
    console.error('Failed to get salary slip layout config:', error);
  }
  return defaultConfig;
}

export async function saveSalarySlipLayoutConfig(config: SalarySlipLayoutConfig) {
  try {
    await prisma.payrollSetting.upsert({
      where: { key: 'salary_slip_layout_config' },
      update: {
        value: JSON.stringify(config),
        category: 'salary_slip',
      },
      create: {
        key: 'salary_slip_layout_config',
        value: JSON.stringify(config),
        category: 'salary_slip',
        description: 'Salary Slip PDF Layout & Customization Settings',
      },
    });

    revalidatePath('/dashboard/salary-slips');
    revalidatePath('/dashboard/settings/salary-slip-layout');
    return { success: true, message: 'Salary slip layout template saved successfully!' };
  } catch (error: any) {
    console.error('Failed to save salary slip layout config:', error);
    return { success: false, message: error.message || 'Failed to save salary slip layout' };
  }
}
