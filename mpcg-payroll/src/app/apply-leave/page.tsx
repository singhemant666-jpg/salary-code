import { prisma } from '@/lib/prisma';
import ApplyLeaveClientForm from '@/app/apply-leave/ApplyLeaveClientForm';

export const metadata = {
  title: 'Apply Leave | My Pain Clinic Global',
  description: 'Online Employee Leave Application Form',
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
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f8fafc',
      backgroundImage: 'linear-gradient(180deg, #f1f5f9 0%, #f8fafc 100%)',
      padding: '2rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Global Responsive Styles & Clean Card Design */}
      <style>{`
        .leave-card-container {
          width: 100%;
          max-width: 620px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 2.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .responsive-date-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .responsive-btn-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1rem;
        }

        .responsive-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        /* Mobile Responsive Overrides */
        @media (max-width: 640px) {
          .leave-card-container {
            padding: 1.25rem 1rem !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04) !important;
          }
          .responsive-date-grid {
            grid-template-columns: 1fr !important;
            gap: 0.85rem !important;
          }
          .responsive-btn-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .responsive-summary-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .header-title {
            font-size: 1.4rem !important;
          }
          .header-subtitle {
            font-size: 0.825rem !important;
          }
        }
      `}</style>

      <div className="leave-card-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '6px 14px',
            background: '#eff6ff',
            borderRadius: '20px',
            border: '1px solid #bfdbfe',
            marginBottom: '0.75rem',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>📝</span>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.05em', color: '#1d4ed8', textTransform: 'uppercase' }}>
              MY PAIN CLINIC GLOBAL
            </span>
          </div>

          <h1 className="header-title" style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 0.35rem 0',
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>
            Employee Leave Application
          </h1>
          
          <p className="header-subtitle" style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Submit your leave letter & details. Applications will be sent directly to HR for Approval / Rejection.
          </p>
        </div>

        <ApplyLeaveClientForm employees={employees} />
      </div>
    </div>
  );
}


