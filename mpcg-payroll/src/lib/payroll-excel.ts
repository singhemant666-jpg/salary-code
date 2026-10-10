import * as XLSX from 'xlsx';
import { getMonthName } from '@/lib/currency-utils';

export interface ExportPayrollExcelOptions {
  month: number;
  year: number;
  payrolls: any[];
  stats?: {
    totalEmployees: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    totalLOP: number;
    totalIncentives?: number;
    totalOvertime?: number;
    totalAdvances?: number;
  };
  companyName?: string;
}

export function generatePayrollExcelReport({
  month,
  year,
  payrolls,
  stats,
  companyName = 'MY PAIN CLINIC GLOBAL',
}: ExportPayrollExcelOptions): Buffer {
  const monthName = getMonthName(month);
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: Detailed Salary Register
  // -------------------------------------------------------------
  const sheetRows: any[][] = [];

  // Header Title block
  sheetRows.push([companyName.toUpperCase()]);
  sheetRows.push(['ADVANCED PHYSIOTHERAPY AND WELLNESS CLINIC']);
  sheetRows.push([`EXECUTIVE SALARY REGISTER & DETAILED PAYROLL REPORT — ${monthName.toUpperCase()} ${year}`]);
  sheetRows.push([
    `Report Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} | Pay Period: ${monthName} ${year} | Total Employees: ${payrolls.length}`,
  ]);
  sheetRows.push([]); // Empty row

  // Table Column Headers (Biometric ID removed, Salary Advance retained, PF changed to ESIC)
  const headers = [
    'Sr No',
    'Employee ID',
    'Employee Name',
    'Department',
    'Designation',
    'Joining Date',
    'Exit Date',
    'Total Month Days',
    'Present Days',
    'Paid Leaves',
    'Weekly Offs',
    'Holidays',
    'LOP Days',
    'Late Incidents',
    'Sudden Leave Days',
    'Sandwiched Offs',
    'Total Worked Hrs',
    'Short Hours',
    'Overtime Hours',
    // Earnings
    'Basic Salary (₹)',
    'Overtime Pay (₹)',
    'Incentive (₹)',
    'Bonus (₹)',
    'Hold Released (₹)',
    'GROSS SALARY (₹)',
    // Deductions
    'LOP Deduction (₹)',
    'Late Penalty (₹)',
    'Sudden Leave Penalty (₹)',
    'Short Hours Deduction (₹)',
    'Professional Tax - PT (₹)',
    'Salary Advance (₹)',
    'ESIC (₹)',
    'TDS (₹)',
    'SD (₹)',
    'Other Deduction (₹)',
    'TOTAL DEDUCTIONS (₹)',
    // Net
    'NET PAYABLE SALARY (₹)',
    // Banking & Statutory
    'Payment Status',
    'Bank Name',
    'Account Number',
    'IFSC Code',
    'PAN Number',
    'Remarks / Notes',
  ];

  sheetRows.push(headers);

  // Totals accumulators
  let totPresentDays = 0;
  let totPaidLeaves = 0;
  let totWeeklyOffs = 0;
  let totLopDays = 0;
  let totLateIncidents = 0;
  let totSuddenLeaveDays = 0;
  let totOvertimeHours = 0;
  let totBasic = 0;
  let totOvertimePay = 0;
  let totIncentive = 0;
  let totBonus = 0;
  let totHoldRelease = 0;
  let totGross = 0;
  let totLopDed = 0;
  let totLateDed = 0;
  let totSuddenDed = 0;
  let totShortHrsDed = 0;
  let totPtDed = 0;
  let totAdvanceDed = 0;
  let totEsicDed = 0;
  let totTdsDed = 0;
  let totHoldDed = 0;
  let totOtherDed = 0;
  let totDeductions = 0;
  let totNetSalary = 0;

  payrolls.forEach((p, idx) => {
    const emp = p.employee || {};
    const rawEmpId = (emp.employeeId || '').trim();
    const cleanEmpId = rawEmpId.startsWith('MPC-') ? rawEmpId : (rawEmpId ? `MPC-${rawEmpId}` : '—');

    const joiningStr = emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—';
    const exitStr = emp.exitDate ? new Date(emp.exitDate).toLocaleDateString('en-IN') : '—';

    // Numbers
    const present = Number(p.presentDays || 0);
    const paidLeave = Number(p.paidLeaveDays || 0);
    const wOffs = Number(p.weeklyOffs || 0);
    const hDays = Number(p.holidays || 0);
    const lop = Number(p.lopDays || 0);
    const lateCount = Number(p.lateCount ?? p.latePenaltyDays ?? 0);
    const suddenDays = Number(p.suddenLeavePenaltyDays || 0);
    const sandwich = Number(p.sandwichedDays || 0);
    const totalHrs = Number(p.totalWorkingHours || 0);
    const shortHrs = Number(p.shortWorkingHours || 0);
    const otHrs = Number(p.overtimeHours || 0);

    const basic = Number(p.basicSalary || 0);
    const otPay = Number(p.overtimeAmount || 0);
    const incentive = Number(p.incentiveAmount || 0);
    const bonus = Number(p.bonusAmount || 0);
    const holdRelease = Number(p.holdSalaryReleaseAmount || 0);
    const gross = Number(p.grossSalary || 0);

    const lopDed = Number(p.lopDeduction || 0);
    const lateDed = Number(p.latePenaltyDeduction || 0);
    const suddenDed = Number(p.suddenLeavePenaltyDeduction || 0);
    const shortHrsDed = Number(p.shortHoursDeduction || 0);
    const ptDed = Number(p.ptDeduction || 0);
    const advanceDed = Number(p.advanceDeduction || 0) + Number(p.loanDeduction || 0);
    const esicDed = Number(p.pfDeduction || 0);
    const tdsDed = Number((p as any).tdsDeduction || 0);
    const holdDed = Number(p.holdSalaryDeduction || 0);
    const otherDed = Number(p.otherDeduction || 0);
    const totalDed = Number(p.totalDeduction || 0);
    const net = Number(p.netSalary || 0);

    // Accumulate
    totPresentDays += present;
    totPaidLeaves += paidLeave;
    totWeeklyOffs += wOffs;
    totLopDays += lop;
    totLateIncidents += lateCount;
    totSuddenLeaveDays += suddenDays;
    totOvertimeHours += otHrs;
    totBasic += basic;
    totOvertimePay += otPay;
    totIncentive += incentive;
    totBonus += bonus;
    totHoldRelease += holdRelease;
    totGross += gross;
    totLopDed += lopDed;
    totLateDed += lateDed;
    totSuddenDed += suddenDed;
    totShortHrsDed += shortHrsDed;
    totPtDed += ptDed;
    totAdvanceDed += advanceDed;
    totEsicDed += esicDed;
    totTdsDed += tdsDed;
    totHoldDed += holdDed;
    totOtherDed += otherDed;
    totDeductions += totalDed;
    totNetSalary += net;

    sheetRows.push([
      idx + 1,
      cleanEmpId,
      emp.name || '—',
      emp.department || 'General',
      emp.designation || 'Staff',
      joiningStr,
      exitStr,
      Number(p.totalDays || 30),
      present,
      paidLeave,
      wOffs,
      hDays,
      lop,
      lateCount,
      suddenDays,
      sandwich,
      totalHrs,
      shortHrs,
      otHrs,
      // Earnings
      basic,
      otPay,
      incentive,
      bonus,
      holdRelease,
      gross,
      // Deductions
      lopDed,
      lateDed,
      suddenDed,
      shortHrsDed,
      ptDed,
      advanceDed,
      esicDed,
      tdsDed,
      holdDed,
      otherDed,
      totalDed,
      // Net
      net,
      // Banking & notes
      p.status || 'PROCESSED',
      emp.bankName || '—',
      emp.accountNumber ? `'${emp.accountNumber}` : '—',
      emp.ifscCode || '—',
      emp.panNumber || '—',
      p.remarks || (p.otherDeductionNote ? `Note: ${p.otherDeductionNote}` : ''),
    ]);
  });

  // GRAND TOTAL ROW
  sheetRows.push([
    'TOTAL',
    '',
    `Total Employees: ${payrolls.length}`,
    '',
    '',
    '',
    '',
    '',
    Math.round(totPresentDays * 100) / 100,
    Math.round(totPaidLeaves * 100) / 100,
    totWeeklyOffs,
    '',
    Math.round(totLopDays * 100) / 100,
    totLateIncidents,
    totSuddenLeaveDays,
    '',
    '',
    '',
    Math.round(totOvertimeHours * 100) / 100,
    // Earnings Totals
    Math.round(totBasic * 100) / 100,
    Math.round(totOvertimePay * 100) / 100,
    Math.round(totIncentive * 100) / 100,
    Math.round(totBonus * 100) / 100,
    Math.round(totHoldRelease * 100) / 100,
    Math.round(totGross * 100) / 100,
    // Deductions Totals
    Math.round(totLopDed * 100) / 100,
    Math.round(totLateDed * 100) / 100,
    Math.round(totSuddenDed * 100) / 100,
    Math.round(totShortHrsDed * 100) / 100,
    Math.round(totPtDed * 100) / 100,
    Math.round(totAdvanceDed * 100) / 100,
    Math.round(totEsicDed * 100) / 100,
    Math.round(totTdsDed * 100) / 100,
    Math.round(totHoldDed * 100) / 100,
    Math.round(totOtherDed * 100) / 100,
    Math.round(totDeductions * 100) / 100,
    // Net Total
    Math.round(totNetSalary * 100) / 100,
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  const wsRegister = XLSX.utils.aoa_to_sheet(sheetRows);

  // Column widths definition for readability (42 columns)
  const colWidths = [
    { wch: 8 },  // Sr No
    { wch: 14 }, // Employee ID
    { wch: 28 }, // Employee Name
    { wch: 18 }, // Department
    { wch: 24 }, // Designation
    { wch: 14 }, // Joining Date
    { wch: 14 }, // Exit Date
    { wch: 16 }, // Total Month Days
    { wch: 14 }, // Present Days
    { wch: 14 }, // Paid Leaves
    { wch: 14 }, // Weekly Offs
    { wch: 12 }, // Holidays
    { wch: 12 }, // LOP Days
    { wch: 15 }, // Late Incidents
    { wch: 18 }, // Sudden Leave Days
    { wch: 16 }, // Sandwiched Offs
    { wch: 16 }, // Total Worked Hrs
    { wch: 14 }, // Short Hours
    { wch: 15 }, // Overtime Hours
    // Earnings
    { wch: 16 }, // Basic Salary
    { wch: 16 }, // Overtime Pay
    { wch: 14 }, // Incentive
    { wch: 14 }, // Bonus
    { wch: 16 }, // Hold Released
    { wch: 18 }, // GROSS SALARY
    // Deductions
    { wch: 16 }, // LOP Deduction
    { wch: 16 }, // Late Penalty
    { wch: 22 }, // Sudden Leave Penalty
    { wch: 20 }, // Short Hours Deduction
    { wch: 22 }, // Professional Tax - PT
    { wch: 18 }, // Salary Advance
    { wch: 14 }, // ESIC
    { wch: 16 }, // Joining Hold
    { wch: 18 }, // Other Deduction
    { wch: 20 }, // TOTAL DEDUCTIONS
    // Net
    { wch: 22 }, // NET PAYABLE SALARY
    // Banking & Statutory
    { wch: 18 }, // Payment Status
    { wch: 22 }, // Bank Name
    { wch: 22 }, // Account Number
    { wch: 16 }, // IFSC Code
    { wch: 16 }, // PAN Number
    { wch: 30 }, // Remarks / Notes
  ];
  wsRegister['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsRegister, `Salary Register - ${monthName.slice(0, 3)}`);

  // -------------------------------------------------------------
  // SHEET 2: Executive Summary & Department Breakdown
  // -------------------------------------------------------------
  const summaryRows: any[][] = [];
  summaryRows.push([companyName.toUpperCase()]);
  summaryRows.push(['EXECUTIVE PAYROLL SUMMARY & DEPARTMENT BREAKDOWN']);
  summaryRows.push([`Pay Period: ${monthName} ${year}`]);
  summaryRows.push([]);

  // KPI Block
  summaryRows.push(['METRIC', 'VALUE']);
  summaryRows.push(['Total Active / Processed Employees', payrolls.length]);
  summaryRows.push(['Total Gross Salary', Math.round(totGross * 100) / 100]);
  summaryRows.push(['Total Deductions Applied', Math.round(totDeductions * 100) / 100]);
  summaryRows.push(['Net Salary Payable / Disbursed', Math.round(totNetSalary * 100) / 100]);
  summaryRows.push(['Total Loss of Pay (LOP) Deductions', Math.round(totLopDed * 100) / 100]);
  summaryRows.push(['Total Sudden Leave Penalty Deductions', Math.round(totSuddenDed * 100) / 100]);
  summaryRows.push(['Total Late Arrival Deductions', Math.round(totLateDed * 100) / 100]);
  summaryRows.push(['Total Short Hours Deductions', Math.round(totShortHrsDed * 100) / 100]);
  summaryRows.push(['Total Professional Tax (PT) Collected', Math.round(totPtDed * 100) / 100]);
  summaryRows.push(['Total ESIC Deductions', Math.round(totEsicDed * 100) / 100]);
  summaryRows.push(['Total Salary Advance Deductions', Math.round(totAdvanceDed * 100) / 100]);
  summaryRows.push(['Total Incentives & Bonuses Paid', Math.round((totIncentive + totBonus) * 100) / 100]);
  summaryRows.push(['Total Overtime Disbursed', Math.round(totOvertimePay * 100) / 100]);
  summaryRows.push([]);

  // Department Breakdown
  summaryRows.push(['DEPARTMENT-WISE PAYROLL BREAKDOWN']);
  summaryRows.push(['Department', 'Headcount', 'Total Gross (₹)', 'Total Deductions (₹)', 'Net Salary (₹)']);

  const deptMap = new Map<string, { count: number; gross: number; deductions: number; net: number }>();
  for (const p of payrolls) {
    const dept = p.employee?.department || 'Unassigned / General';
    const cur = deptMap.get(dept) || { count: 0, gross: 0, deductions: 0, net: 0 };
    cur.count++;
    cur.gross += Number(p.grossSalary || 0);
    cur.deductions += Number(p.totalDeduction || 0);
    cur.net += Number(p.netSalary || 0);
    deptMap.set(dept, cur);
  }

  for (const [dept, data] of deptMap.entries()) {
    summaryRows.push([
      dept,
      data.count,
      Math.round(data.gross * 100) / 100,
      Math.round(data.deductions * 100) / 100,
      Math.round(data.net * 100) / 100,
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}
