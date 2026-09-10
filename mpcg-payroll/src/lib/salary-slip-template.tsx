import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { formatAmount, amountInWords, getMonthName } from './currency-utils';

// ============================================================
// Styles (Built-in Helvetica font — Zero network calls)
// ============================================================

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  pageWithLetterhead: {
    paddingTop: 95,
    paddingBottom: 35,
    paddingLeft: 30,
    paddingRight: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 595,
    height: 842,
  },
  headerImage: {
    width: 595,
    height: 95,
    marginTop: -30,
    marginLeft: -30,
    marginRight: -30,
    marginBottom: 12,
    objectFit: 'cover',
    objectPosition: 'top',
  },
  // Text Header (fallback)
  header: {
    textAlign: 'center',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#123B6D',
    textAlign: 'center',
    letterSpacing: 1,
  },
  slipTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },

  // Employee Table
  empTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#777777',
    marginBottom: 12,
  },
  empRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#777777',
  },
  empRowLast: {
    flexDirection: 'row',
  },
  empCellLabel: {
    width: '20%',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f3f4f6',
    borderRightWidth: 1,
    borderRightColor: '#777777',
    fontSize: 8,
  },
  empCellValue: {
    width: '30%',
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#777777',
    fontSize: 8.5,
  },

  // Salary Table
  salaryTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#777777',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#123B6D',
  },
  headerCellEarnings: {
    width: '50%',
    padding: 6,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },
  headerCellDeductions: {
    width: '50%',
    padding: 6,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    fontSize: 9,
  },
  subHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EAF0F7',
    borderBottomWidth: 1,
    borderBottomColor: '#777777',
  },
  subHeaderCellParticulars: {
    width: '32%',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },
  subHeaderCellAmount: {
    width: '18%',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'right',
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 18,
  },
  cellParticulars: {
    width: '32%',
    padding: 4,
    fontSize: 8.5,
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },
  cellAmount: {
    width: '18%',
    padding: 4,
    fontSize: 8.5,
    textAlign: 'right',
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F1',
    borderTopWidth: 1,
    borderTopColor: '#777777',
  },
  totalCellParticulars: {
    width: '32%',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },
  totalCellAmount: {
    width: '18%',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    textAlign: 'right',
    borderRightWidth: 1,
    borderRightColor: '#777777',
  },

  // Net Box (Compact Corporate Style)
  netBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 3,
  },
  netRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 3,
  },
  netRow2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  netAmount: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  netWordsLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#475569',
    marginRight: 6,
  },
  netWordsValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    flex: 1,
  },

  // Signature Table
  signatureTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 35,
  },
  signatureBox: {
    width: '23%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#555555',
    paddingTop: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },

  // Note
  note: {
    marginTop: 15,
    fontSize: 8,
    color: '#555555',
  },
});

export interface SalarySlipProps {
  employeeName: string;
  employeeId: string;
  designation: string;
  department: string;
  month: number;
  year: number;
  payDate: string;
  paidDays: number;
  lopDays: number;
  leaveDays: number;
  basicSalary: number;
  hra: number;
  conveyance: number;
  otherAllowance: number;
  incentive: number;
  overtime: number;
  bonus: number;
  grossSalary: number;
  lopDeduction: number;
  shortHoursDeduction?: number;
  shortWorkingHours?: number;
  holdSalaryDeduction?: number;
  advanceDeduction: number;
  loanDeduction: number;
  otherDeduction: number;
  pfDeduction: number;
  totalDeduction: number;
  netSalary: number;

  // Customization Options
  companyName?: string;
  slipTitle?: string;
  noteText?: string;
  headerImageBase64?: string;
  showHeaderLogo?: boolean;
  showSignatures?: boolean;
  showHra?: boolean;
  showConveyance?: boolean;
  showIncentive?: boolean;
  showOvertime?: boolean;
  sig1Label?: string;
  sig2Label?: string;
  sig3Label?: string;
  sig4Label?: string;
  panNumber?: string;
  joiningDate?: string;
  initialSalary?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  customEarnings?: { name: string; amount: number }[];
  customDeductions?: { name: string; amount: number }[];
}

export function SalarySlipDocument(props: SalarySlipProps) {
  const monthName = getMonthName(props.month);
  const monthYear = `${monthName} ${props.year}`;

  const bankCombined = (props.bankName || props.accountNumber)
    ? `${props.bankName || ''}${props.bankName && props.accountNumber ? ' - ' : ''}${props.accountNumber || ''}`
    : '—';

  const earningsList: [string, number][] = [
    ['Basic Salary', props.basicSalary],
  ];
  if ((props.showIncentive ?? true) && props.incentive > 0) {
    earningsList.push(['Performance Incentive', props.incentive]);
  }
  if ((props.showOvertime ?? true) && props.overtime > 0) {
    earningsList.push(['Overtime Earnings', props.overtime]);
  }
  if (props.bonus > 0) {
    earningsList.push(['Bonus', props.bonus]);
  }

  let customEarningsTotal = 0;
  if (props.customEarnings && props.customEarnings.length > 0) {
    props.customEarnings.forEach(item => {
      if (item.name && item.amount > 0) {
        earningsList.push([item.name, item.amount]);
        customEarningsTotal += item.amount;
      }
    });
  }

  const deductionsList: [string, number][] = [];
  let customDeductionsTotal = 0;

  if (props.advanceDeduction > 0) deductionsList.push(['Advance Repayment', props.advanceDeduction]);
  if (props.loanDeduction > 0) deductionsList.push(['Loan Deduction', props.loanDeduction]);
  if (props.lopDeduction > 0) deductionsList.push(['Leave Without Pay', props.lopDeduction]);
  if (props.shortHoursDeduction && props.shortHoursDeduction > 0) {
    deductionsList.push(['Short Working Hours', props.shortHoursDeduction]);
  }
  if (props.holdSalaryDeduction && props.holdSalaryDeduction > 0) {
    deductionsList.push(['Joining Salary Hold (15 Days)', props.holdSalaryDeduction]);
  }
  if (props.otherDeduction > 0) deductionsList.push(['Other Deduction', props.otherDeduction]);
  if (props.pfDeduction > 0) deductionsList.push(['PF Deduction', props.pfDeduction]);

  if (props.customDeductions && props.customDeductions.length > 0) {
    props.customDeductions.forEach(item => {
      if (item.name && item.amount > 0) {
        deductionsList.push([item.name, item.amount]);
        customDeductionsTotal += item.amount;
      }
    });
  }

  const baseDeductions = (props.lopDeduction || 0) + (props.shortHoursDeduction || 0) + (props.holdSalaryDeduction || 0) + (props.advanceDeduction || 0) + (props.loanDeduction || 0) + (props.otherDeduction || 0) + (props.pfDeduction || 0);
  const totalDeductionsComputed = baseDeductions + customDeductionsTotal;
  const grossSalaryComputed = (props.grossSalary || 0) + customEarningsTotal;
  const netSalaryComputed = Math.max(0, grossSalaryComputed - totalDeductionsComputed);

  // Ensure equal length rows
  const maxRows = Math.max(earningsList.length, deductionsList.length, 4);
  while (earningsList.length < maxRows) earningsList.push(['', 0]);
  while (deductionsList.length < maxRows) deductionsList.push(['', 0]);

  return (
    <Document>
      <Page size="A4" style={props.headerImageBase64 && props.showHeaderLogo !== false ? styles.pageWithLetterhead : styles.page}>
        {/* Full Page Letterhead Background (Includes Top Banner & Bottom Footer Bar) */}
        {props.headerImageBase64 && props.showHeaderLogo !== false ? (
          <Image src={props.headerImageBase64} style={styles.backgroundImage} fixed />
        ) : (
          <View style={styles.header}>
            <Text style={styles.companyName}>{props.companyName || 'MY PAIN CLINIC GLOBAL'}</Text>
          </View>
        )}

        <Text style={styles.slipTitle}>{props.slipTitle || 'SALARY SLIP'}</Text>

        {/* Employee Details Grid */}
        <View style={styles.empTable}>
          <View style={styles.empRow}>
            <Text style={styles.empCellLabel}>Employee Name</Text>
            <Text style={styles.empCellValue}>{props.employeeName}</Text>
            <Text style={styles.empCellLabel}>Month & Year</Text>
            <Text style={[styles.empCellValue, { borderRightWidth: 0 }]}>{monthYear}</Text>
          </View>

          <View style={styles.empRow}>
            <Text style={styles.empCellLabel}>Employee ID</Text>
            <Text style={styles.empCellValue}>{props.employeeId}</Text>
            <Text style={styles.empCellLabel}>PAN No.</Text>
            <Text style={[styles.empCellValue, { borderRightWidth: 0 }]}>{props.panNumber || '—'}</Text>
          </View>

          <View style={styles.empRow}>
            <Text style={styles.empCellLabel}>Designation</Text>
            <Text style={styles.empCellValue}>{props.designation || '—'}</Text>
            <Text style={styles.empCellLabel}>Department</Text>
            <Text style={[styles.empCellValue, { borderRightWidth: 0 }]}>{props.department || '—'}</Text>
          </View>

          <View style={styles.empRow}>
            <Text style={styles.empCellLabel}>Date of Joining</Text>
            <Text style={styles.empCellValue}>{props.joiningDate || '—'}</Text>
            <Text style={styles.empCellLabel}>Initial Salary (Fixed)</Text>
            <Text style={[styles.empCellValue, { borderRightWidth: 0 }]}>
              {(props.initialSalary && props.initialSalary > 0) ? `Rs. ${formatAmount(props.initialSalary)}` : '—'}
            </Text>
          </View>

          <View style={styles.empRowLast}>
            <Text style={styles.empCellLabel}>Bank Name & A/C</Text>
            <Text style={styles.empCellValue}>{bankCombined}</Text>
            <Text style={styles.empCellLabel}>Paid / Leave Without Pay Days</Text>
            <Text style={[styles.empCellValue, { borderRightWidth: 0 }]}>{props.paidDays} Days / {props.lopDays} Leave Without Pay</Text>
          </View>
        </View>

        {/* Salary Table */}
        <View style={styles.salaryTable}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCellEarnings}>EARNINGS</Text>
            <Text style={styles.headerCellDeductions}>DEDUCTIONS</Text>
          </View>

          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeaderCellParticulars}>PARTICULARS</Text>
            <Text style={styles.subHeaderCellAmount}>AMOUNT (Rs.)</Text>
            <Text style={styles.subHeaderCellParticulars}>PARTICULARS</Text>
            <Text style={[styles.subHeaderCellAmount, { borderRightWidth: 0 }]}>AMOUNT (Rs.)</Text>
          </View>

          {earningsList.map((eItem, idx) => {
            const dItem = deductionsList[idx] || ['', 0];
            return (
              <View key={idx} style={styles.dataRow}>
                <Text style={styles.cellParticulars}>{eItem[0]}</Text>
                <Text style={styles.cellAmount}>{eItem[0] ? formatAmount(eItem[1]) : ''}</Text>
                <Text style={styles.cellParticulars}>{dItem[0]}</Text>
                <Text style={[styles.cellAmount, { borderRightWidth: 0 }]}>
                  {dItem[0] ? formatAmount(dItem[1]) : ''}
                </Text>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalCellParticulars}>GROSS SALARY</Text>
            <Text style={styles.totalCellAmount}>{formatAmount(grossSalaryComputed)}</Text>
            <Text style={styles.totalCellParticulars}>TOTAL DEDUCTION</Text>
            <Text style={[styles.totalCellAmount, { borderRightWidth: 0 }]}>
              {formatAmount(totalDeductionsComputed)}
            </Text>
          </View>
        </View>

        {/* Net Salary Payable Box (Compact Corporate Style) */}
        <View style={styles.netBox}>
          <View style={styles.netRow1}>
            <Text style={styles.netTitle}>NET SALARY PAYABLE</Text>
            <Text style={styles.netAmount}>Rs. {formatAmount(netSalaryComputed)}</Text>
          </View>
          <View style={styles.netRow2}>
            <Text style={styles.netWordsLabel}>Net Salary in words:</Text>
            <Text style={styles.netWordsValue}>{amountInWords(netSalaryComputed)}</Text>
          </View>
        </View>

        {/* Signatures (rendered only when showSignatures is true) */}
        {props.showSignatures && (
          <View style={styles.signatureTable}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>{props.sig1Label || 'Employee Signature'}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>{props.sig2Label || 'Prepared By'}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>{props.sig3Label || 'Checked By'}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLine}>{props.sig4Label || 'Authorized Signature'}</Text>
            </View>
          </View>
        )}

        {/* Note */}
        <Text style={styles.note}>
          {props.noteText !== undefined
            ? props.noteText
            : 'Note: This is a computer-generated salary slip. PF is not included in this salary structure.'}
        </Text>
      </Page>
    </Document>
  );
}
