import { prisma } from '@/lib/prisma';
import { getMonthName } from '@/lib/currency-utils';
import { ensureDatabaseSchemaSynced } from '@/lib/db-auto-migrate';
import SalarySlipFilters from './SalarySlipFilters';
import SalarySlipsInteractiveTable from './SalarySlipsInteractiveTable';

export default async function SalarySlipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await ensureDatabaseSchemaSynced();
  const params = await searchParams;
  const now = new Date();
  
  let month = params.month ? parseInt(params.month) : 0;
  let year = params.year ? parseInt(params.year) : 0;

  if (!month || !year) {
    const latestSlip = await prisma.salarySlip.findFirst({
      orderBy: { generatedAt: 'desc' },
      select: { month: true, year: true }
    });
    if (latestSlip) {
      month = latestSlip.month;
      year = latestSlip.year;
    } else {
      const latestPayroll = await prisma.monthlyPayroll.findFirst({
        where: { employee: { status: 'ACTIVE' } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { month: true, year: true }
      });
      month = latestPayroll ? latestPayroll.month : now.getMonth() + 1;
      year = latestPayroll ? latestPayroll.year : now.getFullYear();
    }
  }

  const rawSlips = await prisma.salarySlip.findMany({
    where: { 
      month, 
      year,
      employee: { status: 'ACTIVE' },
    },
    include: {
      employee: { select: { employeeId: true, name: true, email: true, mobile: true, designation: true } },
    },
    orderBy: { employee: { name: 'asc' } },
  });

  let deliveryMap = new Map<string, any>();
  try {
    const rawDelivery: any[] = await prisma.$queryRaw`
      SELECT id, emailSentAt, emailSentTo, emailSendCount, whatsappSentAt, whatsappSentTo, whatsappSendCount
      FROM salary_slips
      WHERE month = ${month} AND year = ${year}
    `;
    deliveryMap = new Map(rawDelivery.map(d => [d.id, d]));
  } catch (e) {
    console.warn('Could not query salary slip delivery data:', e);
  }

  const formattedSlips = rawSlips.map(slip => {
    const delivery = deliveryMap.get(slip.id);
    const emailSentAt = delivery?.emailSentAt ? new Date(delivery.emailSentAt).toLocaleString('en-IN') : null;
    const whatsappSentAt = delivery?.whatsappSentAt ? new Date(delivery.whatsappSentAt).toLocaleString('en-IN') : null;

    return {
      id: slip.id,
      payrollId: slip.payrollId,
      fileName: slip.fileName,
      generatedAt: slip.generatedAt.toLocaleString('en-IN'),
      generatedBy: slip.generatedBy,
      emailSentAt,
      emailSentTo: delivery?.emailSentTo || null,
      emailSendCount: Number(delivery?.emailSendCount || 0),
      whatsappSentAt,
      whatsappSentTo: delivery?.whatsappSentTo || null,
      whatsappSendCount: Number(delivery?.whatsappSendCount || 0),
      isDelivered: Boolean(emailSentAt || whatsappSentAt),
      employee: {
        employeeId: slip.employee.employeeId,
        name: slip.employee.name,
        email: slip.employee.email,
        mobile: slip.employee.mobile,
        designation: slip.employee.designation,
      },
    };
  });

  const deliveredCount = formattedSlips.filter(s => s.isDelivered).length;
  const pendingCount = formattedSlips.length - deliveredCount;

  const showHeaderLogo = params.showHeaderLogo !== 'false';
  const showSignatures = params.showSignatures === 'true';
  const showHra = params.showHra !== 'false';
  const showConveyance = params.showConveyance !== 'false';
  const showIncentive = params.showIncentive !== 'false';
  const showOvertime = params.showOvertime !== 'false';

  const queryStr = `?showHeaderLogo=${showHeaderLogo}&showSignatures=${showSignatures}&showHra=${showHra}&showConveyance=${showConveyance}&showIncentive=${showIncentive}&showOvertime=${showOvertime}`;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Slips</h1>
          <p className="page-subtitle">
            {getMonthName(month)} {year} · {formattedSlips.length} slips generated
            <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>•</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>{deliveredCount} delivered</span>
            <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>•</span>
            <span style={{ color: pendingCount > 0 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>{pendingCount} pending</span>
          </p>
        </div>
        <SalarySlipFilters month={month} year={year} />
      </div>

      <SalarySlipsInteractiveTable slips={formattedSlips} queryStr={queryStr} />
    </div>
  );
}
