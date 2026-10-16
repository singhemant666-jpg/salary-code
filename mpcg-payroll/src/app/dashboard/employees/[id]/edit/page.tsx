import { getEmployeeById, isEmployeeSandwichRuleEnabled, isEmployeeMissingPunchPenaltyEnabled, getEmployeeOpeningPaidLeavesUsed } from '@/actions/employees';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EditEmployeeForm from './EditEmployeeForm';

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const returnUrl = sParams.returnUrl;
  const rawEmployee = await getEmployeeById(id);

  if (!rawEmployee) notFound();

  // Convert Prisma Decimal and Date objects to plain JSON
  const employee = JSON.parse(JSON.stringify(rawEmployee));

  const activeSalary = employee.salaryStructures?.find((s: any) => s.isActive) || employee.salaryStructures?.[0] || {
    basicSalary: 0,
    hra: 0,
    conveyance: 0,
    otherAllowance: 0,
    incentiveEligible: false,
    overtimeEligible: true,
  };

  const plainEmployee = {
    ...employee,
    basicSalary: Number(activeSalary.basicSalary || 0),
    hra: Number(activeSalary.hra || 0),
    conveyance: Number(activeSalary.conveyance || 0),
    otherAllowance: Number(activeSalary.otherAllowance || 0),
    initialSalary: activeSalary.initialSalary !== null && activeSalary.initialSalary !== undefined ? Number(activeSalary.initialSalary) : null,
    incentiveEligible: Boolean(activeSalary.incentiveEligible),
    overtimeEligible: Boolean(activeSalary.overtimeEligible),
    salaryEffectiveDate: activeSalary.effectiveDate
      ? new Date(activeSalary.effectiveDate).toISOString().split('T')[0]
      : '',
    salaryStructures: employee.salaryStructures || [],
    standardWorkingHours: Number(employee.standardWorkingHours || 8),
    openingPaidLeavesUsed: await getEmployeeOpeningPaidLeavesUsed(id),
    sandwichRule: await isEmployeeSandwichRuleEnabled(id),
    missingPunchPenalty: await isEmployeeMissingPunchPenaltyEnabled(id),
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href={`/dashboard/employees/${employee.id}${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
            className="btn btn-ghost btn-icon"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">Edit Employee Profile — {employee.name}</h1>
            <p className="page-subtitle">Update working hours, salary structure, department & details</p>
          </div>
        </div>
      </div>

      <EditEmployeeForm employee={plainEmployee} returnUrl={returnUrl} />
    </div>
  );
}
