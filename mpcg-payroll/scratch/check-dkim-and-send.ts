import dns from 'dns';
import { promisify } from 'util';
import { prisma } from '../src/lib/prisma';
import { sendSingleSalarySlipEmail } from '../src/actions/salary-slip-email';

const resolveTxt = promisify(dns.resolveTxt);

async function checkDKIMAndSend() {
  console.log('--- CHECKING DKIM RECORD & SENDING SALARY SLIP EMAIL ---');

  try {
    const dkimRecords = await resolveTxt('default._domainkey.mypainclinicglobal.com');
    console.log('✅ DKIM TXT RECORD FOUND IN DNS:');
    dkimRecords.forEach(r => console.log(' -', r.join('')));
  } catch (err: any) {
    console.log('⚠️ DKIM DNS Lookup Note:', err.message, '(DNS propagation may take a few minutes)');
  }

  // Find Sahil's latest payroll record
  const payroll = await prisma.monthlyPayroll.findFirst({
    where: {
      employee: {
        OR: [
          { name: { contains: 'SAHIL' } },
          { employeeId: 'MPC-175' },
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!payroll) {
    console.error('❌ Payroll record not found for Sahil Singh');
    process.exit(1);
  }

  console.log('\nSending salary slip email to Sahil Singh...');
  const res = await sendSingleSalarySlipEmail(payroll.id);
  console.log('RESULT:', res);

  process.exit(0);
}

checkDKIMAndSend();
