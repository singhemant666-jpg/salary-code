import { prisma } from '@/lib/prisma';
import { getMonthName } from '@/lib/currency-utils';
import SalarySlipFilters from './SalarySlipFilters';
import SalarySlipsInteractiveTable from './SalarySlipsInteractiveTable';

export default async function SalarySlipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
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
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { month: true, year: true }
      });
      month = latestPayroll ? latestPayroll.month : now.getMonth() + 1;
      year = latestPayroll ? latestPayroll.year : now.getFullYear();
    }
  }

  const rawSlips = await prisma.salarySlip.findMany({
    where: { month, year },
    include: {
      employee: { select: { employeeId: true, name: true, email: true, designation: true } },
    },
    orderBy: { employee: { name: 'asc' } },
  });

  const formattedSlips = rawSlips.map(slip => ({
    id: slip.id,
    payrollId: slip.payrollId,
    fileName: slip.fileName,
    generatedAt: slip.generatedAt.toLocaleString('en-IN'),
    generatedBy: slip.generatedBy,
    employee: {
      employeeId: slip.employee.employeeId,
      name: slip.employee.name,
      email: slip.employee.email,
      designation: slip.employee.designation,
    },
  }));

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
          <p className="page-subtitle">{getMonthName(month)} {year} · {formattedSlips.length} slips generated</p>
        </div>
        <SalarySlipFilters month={month} year={year} />
      </div>

      <SalarySlipsInteractiveTable slips={formattedSlips} queryStr={queryStr} />
    </div>
  );
}
