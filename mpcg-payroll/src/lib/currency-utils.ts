// ============================================================
// Indian Rupee Currency Utilities
// ============================================================

/**
 * Format a number as Indian Rupees with proper comma grouping
 * e.g., 1234567.89 → ₹12,34,567.89
 */
export function formatINR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const [intPart, decPart] = absNum.toFixed(2).split('.');

  // Indian comma grouping: first group of 3, then groups of 2
  let formatted = '';
  const digits = intPart.split('');
  const len = digits.length;

  if (len <= 3) {
    formatted = intPart;
  } else {
    // Last 3 digits
    formatted = digits.slice(len - 3).join('');
    // Remaining digits in groups of 2
    let remaining = digits.slice(0, len - 3);
    while (remaining.length > 0) {
      const group = remaining.splice(-2).join('');
      formatted = group + ',' + formatted;
    }
  }

  return `${isNegative ? '-' : ''}₹${formatted}.${decPart}`;
}

/**
 * Format a number as Indian Rupees without the symbol (for tables)
 */
export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const [intPart, decPart] = absNum.toFixed(2).split('.');

  let formatted = '';
  const digits = intPart.split('');
  const len = digits.length;

  if (len <= 3) {
    formatted = intPart;
  } else {
    formatted = digits.slice(len - 3).join('');
    let remaining = digits.slice(0, len - 3);
    while (remaining.length > 0) {
      const group = remaining.splice(-2).join('');
      formatted = group + ',' + formatted;
    }
  }

  return `${isNegative ? '-' : ''}${formatted}.${decPart}`;
}

// ============================================================
// Amount to Words (Indian Rupees)
// ============================================================

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ' ' + ones[o] : '');
}

function threeDigitWords(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let result = '';
  if (h > 0) {
    result += ones[h] + ' Hundred';
    if (rest > 0) result += ' ';
  }
  if (rest > 0) {
    result += twoDigitWords(rest);
  }
  return result;
}

/**
 * Convert a number to words in Indian numbering system
 * Supports up to 99,99,99,999 (99 Crores)
 */
function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToIndianWords(-num);

  const n = Math.floor(num);
  let result = '';

  // Crores (10,000,000)
  const crores = Math.floor(n / 10000000);
  if (crores > 0) {
    result += twoDigitWords(crores) + ' Crore ';
  }

  // Lakhs (100,000)
  const lakhs = Math.floor((n % 10000000) / 100000);
  if (lakhs > 0) {
    result += twoDigitWords(lakhs) + ' Lakh ';
  }

  // Thousands
  const thousands = Math.floor((n % 100000) / 1000);
  if (thousands > 0) {
    result += twoDigitWords(thousands) + ' Thousand ';
  }

  // Hundreds and below
  const remainder = n % 1000;
  if (remainder > 0) {
    result += threeDigitWords(remainder);
  }

  return result.trim();
}

/**
 * Convert amount to Indian Rupee words
 * e.g., 39092.59 → "Thirty Nine Thousand Ninety Two Rupees and Fifty Nine Paise Only"
 */
export function amountInWords(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let result = isNegative ? 'Minus ' : '';
  
  if (rupees > 0) {
    result += numberToIndianWords(rupees) + ' Rupees';
  }

  if (paise > 0) {
    if (rupees > 0) result += ' and ';
    result += numberToIndianWords(paise) + ' Paise';
  }

  result += ' Only';
  return result;
}

/**
 * Parse an Indian formatted amount string back to number
 * e.g., "₹12,34,567.89" → 1234567.89
 */
export function parseINR(formatted: string): number {
  const cleaned = formatted.replace(/[₹,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get the number of days in a specific month/year
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Get short month name from month number (1-12)
 */
export function getShortMonthName(month: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[month - 1] || '';
}
