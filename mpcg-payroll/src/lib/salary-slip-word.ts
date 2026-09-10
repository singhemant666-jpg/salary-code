import { amountInWords, formatAmount, getMonthName } from './currency-utils';
import { SalarySlipLayoutConfig } from '@/actions/salary-slip-config';

export interface SalarySlipWordProps {
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
  panNumber?: string;
  joiningDate?: string;
  initialSalary?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
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
  pfDeduction: number;
  advanceDeduction: number;
  loanDeduction: number;
  otherDeduction: number;
  totalDeduction: number;
  netSalary: number;

  config: SalarySlipLayoutConfig;
  headerImageBase64?: string;
}

export function generateSalarySlipWordHtml(props: SalarySlipWordProps): string {
  const { config } = props;
  const monthName = getMonthName(props.month);
  const monthYear = `${monthName} ${props.year}`;

  const bankCombined = (props.bankName || props.accountNumber)
    ? `${props.bankName || ''}${props.bankName && props.accountNumber ? ' - ' : ''}${props.accountNumber || ''}`
    : '—';

  // Build Earnings list
  const earningsList: [string, number][] = [
    ['Basic Salary', props.basicSalary],
  ];
  if ((config.showIncentive ?? true) && props.incentive > 0) earningsList.push(['Performance Incentive', props.incentive]);
  if ((config.showOvertime ?? true) && props.overtime > 0) earningsList.push(['Overtime Earnings', props.overtime]);
  if (props.bonus > 0) earningsList.push(['Bonus', props.bonus]);

  const enabledCustomEarnings = (config.customEarnings || []).filter(e => e.enabled && (Number(e.defaultValue) || 0) > 0);
  for (const item of enabledCustomEarnings) {
    earningsList.push([item.name, Number(item.defaultValue) || 0]);
  }

  // Build Deductions list
  const deductionsList: [string, number][] = [];
  if ((config.showPfDeduction ?? true) && props.pfDeduction > 0) deductionsList.push(['Provident Fund (PF)', props.pfDeduction]);
  if (props.lopDeduction > 0) deductionsList.push(['Leave Without Pay', props.lopDeduction]);
  if (props.shortHoursDeduction && props.shortHoursDeduction > 0) deductionsList.push(['Short Working Hours', props.shortHoursDeduction]);
  if (props.holdSalaryDeduction && props.holdSalaryDeduction > 0) deductionsList.push(['Joining Salary Hold (15 Days)', props.holdSalaryDeduction]);
  if (props.otherDeduction > 0) deductionsList.push(['Other Deduction', props.otherDeduction]);
  if ((config.showAdvanceDeduction ?? true) && props.advanceDeduction > 0) deductionsList.push(['Advance Repayment', props.advanceDeduction]);
  if ((config.showLoanDeduction ?? true) && props.loanDeduction > 0) deductionsList.push(['Loan Repayment', props.loanDeduction]);

  const enabledCustomDeductions = (config.customDeductions || []).filter(d => d.enabled && (Number(d.defaultValue) || 0) > 0);
  for (const item of enabledCustomDeductions) {
    deductionsList.push([item.name, Number(item.defaultValue) || 0]);
  }

  const maxRows = Math.max(earningsList.length, deductionsList.length, 3);
  const rows: { eName: string; eAmt: string; dName: string; dAmt: string }[] = [];

  for (let i = 0; i < maxRows; i++) {
    const e = earningsList[i];
    const d = deductionsList[i];
    rows.push({
      eName: e ? e[0] : '—',
      eAmt: e ? formatAmount(e[1]) : '—',
      dName: d ? d[0] : '—',
      dAmt: d ? formatAmount(d[1]) : '—',
    });
  }

  const wordsText = amountInWords(props.netSalary);

  return `
<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${config.slipTitle || 'SALARY SLIP'}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.27in 11.69in;
      margin: 0.4in 0.4in 0.4in 0.4in;
      mso-header-margin: 0.4in;
      mso-footer-margin: 0.4in;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #111111;
      line-height: 1.2;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    td, th {
      border: 1px solid #123B6D;
      padding: 4px 6px;
      font-size: 8.5pt;
      vertical-align: middle;
    }
    .title-banner {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      color: #123B6D;
      padding: 4px 0;
      letter-spacing: 1px;
    }
    .sub-banner {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      color: #111111;
      margin-bottom: 10px;
    }
    .th-header {
      background-color: #123B6D;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      font-size: 9pt;
      padding: 5px 0;
    }
    .bg-summary {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    .bg-net {
      background-color: #e2e8f0;
      font-weight: bold;
      font-size: 9.5pt;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .label-col { background-color: #f8fafc; font-weight: bold; width: 22%; }
    .val-col { width: 28%; }
    .sig-table {
      border: none;
      margin-top: 25px;
    }
    .sig-table td {
      border: none;
      border-top: 1px dashed #64748b;
      text-align: center;
      font-size: 8pt;
      font-weight: bold;
      color: #334155;
      padding-top: 5px;
    }
    .footer-note {
      font-size: 8pt;
      color: #64748b;
      margin-top: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${config.showHeaderLogo ? `
      <!-- Letterhead Banner Table (Renders natively in Microsoft Word) -->
      <table style="width: 100%; border: none; margin-bottom: 10px; background-color: #0c3666;">
        <tr>
          <td style="border: none; background-color: #0c3666; padding: 10px 14px; color: #ffffff;">
            <table style="width: 100%; border: none; margin: 0; padding: 0;">
              <tr>
                <td style="border: none; background-color: #0c3666; width: 140px; vertical-align: middle;">
                  <div style="font-size: 18pt; font-weight: bold; color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">
                    MPC
                  </div>
                  <div style="font-size: 7pt; color: #cbd5e1; font-family: Arial, sans-serif; letter-spacing: 0.5px;">
                    MY PAIN CLINIC
                  </div>
                </td>
                <td style="border: none; background-color: #0c3666; text-align: right; vertical-align: middle;">
                  <div style="font-size: 14pt; font-weight: bold; color: #ffffff; letter-spacing: 1px; font-family: Arial, sans-serif;">
                    ${(config.companyName || 'MY PAIN CLINIC GLOBAL').toUpperCase()}
                  </div>
                  <div style="font-size: 7.5pt; color: #cbd5e1; font-weight: normal; letter-spacing: 0.5px; margin-top: 2px;">
                    ADVANCED PHYSIOTHERAPY &amp; WELLNESS CLINIC
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    ` : `
      <div class="title-banner">
        ${config.companyName || 'MY PAIN CLINIC GLOBAL'}
      </div>
    `}

    <div class="sub-banner">
      ${config.slipTitle || 'SALARY SLIP'}
    </div>

    <!-- Employee Details Table -->
    <table>
      <tr>
        <td class="label-col">Employee Name</td>
        <td class="val-col">${props.employeeName}</td>
        <td class="label-col">Month &amp; Year</td>
        <td class="val-col">${monthYear}</td>
      </tr>
      <tr>
        <td class="label-col">Employee ID</td>
        <td class="val-col">${props.employeeId}</td>
        <td class="label-col">PAN No.</td>
        <td class="val-col">${props.panNumber || '—'}</td>
      </tr>
      <tr>
        <td class="label-col">Designation</td>
        <td class="val-col">${props.designation}</td>
        <td class="label-col">Department</td>
        <td class="val-col">${props.department}</td>
      </tr>
      <tr>
        <td class="label-col">Date of Joining</td>
        <td class="val-col">${props.joiningDate || '—'}</td>
        <td class="label-col">Initial Salary (Fixed)</td>
        <td class="val-col">${(props.initialSalary && props.initialSalary > 0) ? `Rs. ${formatAmount(props.initialSalary)}` : '—'}</td>
      </tr>
      <tr>
        <td class="label-col">Bank Name &amp; A/C</td>
        <td class="val-col">${bankCombined}</td>
        <td class="label-col">Paid / Leave Without Pay Days</td>
        <td class="val-col">${props.paidDays} Days / ${props.lopDays} Leave Without Pay</td>
      </tr>
    </table>

    <!-- Earnings & Deductions Grid Table -->
    <table>
      <thead>
        <tr>
          <td colspan="2" class="th-header">EARNINGS</td>
          <td colspan="2" class="th-header">DEDUCTIONS</td>
        </tr>
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td style="width: 34%;">PARTICULARS</td>
          <td style="width: 16%;" class="text-right">AMOUNT (Rs.)</td>
          <td style="width: 34%;">PARTICULARS</td>
          <td style="width: 16%;" class="text-right">AMOUNT (Rs.)</td>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.eName}</td>
            <td class="text-right">${r.eAmt}</td>
            <td>${r.dName}</td>
            <td class="text-right">${r.dAmt}</td>
          </tr>
        `).join('')}
        <tr class="bg-summary">
          <td>GROSS SALARY</td>
          <td class="text-right">${formatAmount(props.grossSalary)}</td>
          <td>TOTAL DEDUCTION</td>
          <td class="text-right">${formatAmount(props.totalDeduction)}</td>
        </tr>
        <tr class="bg-net">
          <td colspan="3">NET SALARY PAYABLE</td>
          <td class="text-right">Rs. ${formatAmount(props.netSalary)}</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 9pt; margin-bottom: 15px;">
      <span class="bold">Net Salary in words:</span> ${wordsText}
    </div>

    <!-- Signature Block -->
    ${config.showSignatures ? `
      <table class="sig-table">
        <tr>
          <td style="width: 25%;">${config.sig1Label || 'Employee Signature'}</td>
          <td style="width: 25%;">${config.sig2Label || 'Checked By'}</td>
          <td style="width: 25%;">${config.sig3Label || 'Approved By'}</td>
          <td style="width: 25%;">${config.sig4Label || 'Authorized Signatory'}</td>
        </tr>
      </table>
    ` : ''}

    ${config.noteText ? `
      <div class="footer-note">
        ${config.noteText}
      </div>
    ` : ''}

    ${config.showHeaderLogo ? `
      <!-- Footer Address Bar (Matching Letterhead) -->
      <table style="width: 100%; border: none; margin-top: 15px; background-color: #0c3666;">
        <tr>
          <td style="border: none; background-color: #0c3666; padding: 5px 8px; color: #ffffff; text-align: center; font-size: 7pt; font-family: Arial, sans-serif;">
            UNIT B-1, V. N. SPHERE MALL, NAVCHANDRA BUILDING, LINKING RD, BANDRA WEST, MUMBAI, MAHARASHTRA 400050<br/>
            📞 +91 9169400905/07 &nbsp;&nbsp;|&nbsp;&nbsp; 🌐 www.mypainclinicglobal.com
          </td>
        </tr>
      </table>
    ` : ''}
  </div>
</body>
</html>
  `;
}
