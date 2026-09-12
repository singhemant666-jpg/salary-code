import { prisma } from '@/lib/prisma';
import ApplyLeaveClientForm from '@/app/apply-leave/ApplyLeaveClientForm';
import { Building2, FileEdit } from 'lucide-react';

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
      padding: '2.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Impeccable Design Quality Responsive Layout Styles */}
      <style>{`
        .leave-card-container {
          width: 100%;
          max-width: 640px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 2.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
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

        .form-input-focus:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }

        /* Mobile Responsiveness (320px - 640px) */
        @media (max-width: 640px) {
          .leave-card-container {
            padding: 1.35rem 1.1rem !important;
            border-radius: 14px !important;
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
            font-size: 1.45rem !important;
          }
          .header-subtitle {
            font-size: 0.825rem !important;
          }
        }
      `}</style>

      <div className="leave-card-container">
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.85rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '5px 14px',
            background: '#eff6ff',
            borderRadius: '20px',
            border: '1px solid #bfdbfe',
            marginBottom: '0.85rem',
            alignItems: 'center',
            gap: '7px'
          }}>
            <Building2 size={15} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.06em', color: '#1d4ed8', textTransform: 'uppercase' }}>
              MY PAIN CLINIC GLOBAL
            </span>
          </div>

          <h1 className="header-title" style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            margin: '0 0 0.4rem 0',
            color: '#0f172a',
            letterSpacing: '-0.025em'
          }}>
            Employee Leave Application
          </h1>
          
          <p className="header-subtitle" style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, lineHeight: '1.55' }}>
            Submit your formal leave letter & details. Applications will be sent directly to HR for Approval / Rejection.
          </p>
        </div>

        <ApplyLeaveClientForm employees={employees} />
      </div>
    </div>
  );
}
