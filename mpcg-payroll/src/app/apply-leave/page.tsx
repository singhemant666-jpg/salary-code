import { prisma } from '@/lib/prisma';
import ApplyLeaveClientForm from '@/app/apply-leave/ApplyLeaveClientForm';
import { MpcgBrandMark } from '@/components/brand/MpcgLogo';

export const metadata = {
  title: 'Employee Portal | Apply Leave & Shift Timing Override',
  description: 'Online Employee Portal for Leave Applications and Shift Timing Overrides with WhatsApp Verification',
};

export default async function ApplyLeavePage() {
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      employeeId: true,
      mobile: true,
      department: true,
      designation: true,
      suddenLeavePenalty: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="leave-portal-wrapper">
      <style>{`
        .leave-portal-wrapper {
          min-height: 100vh;
          width: 100%;
          background-color: #f1f5f9;
          background-image: radial-gradient(at 50% 0%, rgba(2, 132, 199, 0.07) 0px, transparent 60%);
          padding: 3rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          box-sizing: border-box;
        }

        .leave-portal-card {
          width: 100%;
          max-width: 620px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 2.25rem 2.5rem;
          box-shadow: 
            0 10px 25px -5px rgba(15, 23, 42, 0.05),
            0 8px 10px -6px rgba(15, 23, 42, 0.03),
            0 0 0 1px rgba(15, 23, 42, 0.02);
          position: relative;
        }

        .portal-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .portal-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 9999px;
          margin-bottom: 1rem;
        }

        .portal-brand-text {
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          color: #0284c7;
          text-transform: uppercase;
        }

        .portal-title {
          font-size: 1.625rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.025em;
          line-height: 1.25;
        }

        .portal-subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.55;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 640px) {
          .leave-portal-wrapper {
            padding: 1.25rem 0.75rem;
          }
          .leave-portal-card {
            padding: 1.5rem 1.15rem;
            border-radius: 12px;
          }
          .portal-title {
            font-size: 1.35rem;
          }
          .portal-subtitle {
            font-size: 0.825rem;
          }
        }
      `}</style>

      <div className="leave-portal-card">
        <header className="portal-header" style={{ marginBottom: '1.25rem' }}>
          <div className="portal-brand">
            <MpcgBrandMark size={22} />
            <span className="portal-brand-text">My Pain Clinic Global · Employee Portal</span>
          </div>
        </header>

        <ApplyLeaveClientForm employees={employees} />
      </div>
    </main>
  );
}
