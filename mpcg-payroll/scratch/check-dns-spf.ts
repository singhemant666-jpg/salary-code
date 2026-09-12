import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

async function checkDNS() {
  console.log('--- CHECKING DOMAIN DNS & SPF RECORDS FOR mypainclinicglobal.com ---');
  try {
    const mx = await resolveMx('mypainclinicglobal.com');
    console.log('MX Records:', mx);
  } catch (err: any) {
    console.error('MX record lookup error:', err.message);
  }

  try {
    const txt = await resolveTxt('mypainclinicglobal.com');
    console.log('\nTXT Records:');
    txt.forEach(record => console.log(' -', record.join('')));
  } catch (err: any) {
    console.error('TXT record lookup error:', err.message);
  }
  process.exit(0);
}

checkDNS();
