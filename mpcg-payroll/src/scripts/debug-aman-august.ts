import { prisma } from '@/lib/prisma';
import { calculateEmployeePayrollInternal } from '@/actions/payroll';

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { name: { contains: 'AMAN' } },
    include: {
      monthlyPayrolls: { where: { month: 8, year: 2026 } }
    }
  });

  if (!emp) {
    console.log('Employee Aman not found!');
    return;
  }

  console.log('Employee name:', emp.name);
  console.log('suddenLeavePenalty setting on employee:', emp.suddenLeavePenalty);

  const p = emp.monthlyPayrolls[0];
  if (!p) {
    console.log('No payroll found for Month 8/2026');
    return;
  }

  console.log('\n--- BEFORE CALC ---');
  console.log({
    id: p.id,
    lopDays: p.lopDays,
    lopDeduction: p.lopDeduction,
    suddenLeavePenaltyDays: p.suddenLeavePenaltyDays,
    suddenLeavePenaltyDeduction: p.suddenLeavePenaltyDeduction,
  });

  const res = await calculateEmployeePayrollInternal(p.id);
  console.log('\n--- CALC FUNCTION RESULT ---', res);

  const after = await prisma.monthlyPayroll.findUnique({ where: { id: p.id } });
  console.log('\n--- AFTER CALC IN DB ---');
  console.log({
    id: after?.id,
    lopDays: after?.lopDays,
    lopDeduction: after?.lopDeduction,
    suddenLeavePenaltyDays: after?.suddenLeavePenaltyDays,
    suddenLeavePenaltyDeduction: after?.suddenLeavePenaltyDeduction,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
