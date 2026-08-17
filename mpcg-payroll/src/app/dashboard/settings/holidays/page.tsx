import { prisma } from '@/lib/prisma';
import HolidayModal from './HolidayModal';
import DeleteHolidayButton from './DeleteHolidayButton';

export default async function HolidaysPage() {
  const holidays = await prisma.holiday.findMany({
    orderBy: { date: 'asc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays</h1>
          <p className="page-subtitle">{holidays.length} holidays configured</p>
        </div>
        <HolidayModal />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Holiday Name</th>
              <th>Optional</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No holidays configured. Click &quot;Add Holiday&quot; to create one.
                </td>
              </tr>
            ) : (
              holidays.map((h: any) => (
                <tr key={h.id}>
                  <td className="font-mono">{h.date.toLocaleDateString('en-IN')}</td>
                  <td className="text-muted">
                    {h.date.toLocaleDateString('en-IN', { weekday: 'long' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>{h.name}</td>
                  <td>
                    <span className={`badge ${h.isOptional ? 'badge-warning' : 'badge-success'}`}>
                      {h.isOptional ? 'Optional' : 'Mandatory'}
                    </span>
                  </td>
                  <td>
                    <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                      <HolidayModal holiday={h} />
                      <DeleteHolidayButton id={h.id} name={h.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
