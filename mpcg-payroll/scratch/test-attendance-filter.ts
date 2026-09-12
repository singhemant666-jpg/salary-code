import { getDailyAttendance } from '../src/actions/attendance';

async function testFilter() {
  console.log('--- TESTING MONTH FILTER IN ATTENDANCE ACTION ---');

  const august = await getDailyAttendance({ month: 8, year: 2026 });
  console.log(`August 2026 records found: ${august.length}`);
  if (august.length > 0) {
    console.log('Sample August date:', august[0].date);
  }

  const september = await getDailyAttendance({ month: 9, year: 2026 });
  console.log(`September 2026 records found: ${september.length}`);
  if (september.length > 0) {
    console.log('Sample September date:', september[0].date);
  }

  process.exit(0);
}

testFilter();
