import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import NewEmployeeForm from './NewEmployeeForm';

export default async function NewEmployeePage() {
  const session = await auth();
  if (!hasPermission(session?.user, 'employees.create')) {
    redirect('/dashboard/employees');
  }

  const canSalary = hasPermission(session?.user, 'employees.salary');
  const canTax = hasPermission(session?.user, 'employees.tax') || canSalary;
  const canPolicies = hasPermission(session?.user, 'employees.policies') || hasPermission(session?.user, 'settings.payroll');

  return (
    <NewEmployeeForm
      canSalary={canSalary}
      canTax={canTax}
      canPolicies={canPolicies}
    />
  );
}
