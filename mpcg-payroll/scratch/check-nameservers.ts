import dns from 'dns';
import { promisify } from 'util';

const resolveNs = promisify(dns.resolveNs);

async function checkNS() {
  console.log('--- CHECKING NAMESERVERS FOR mypainclinicglobal.com ---');
  try {
    const ns = await resolveNs('mypainclinicglobal.com');
    console.log('Nameservers:', ns);
  } catch (err: any) {
    console.error('NS Lookup Error:', err.message);
  }
  process.exit(0);
}

checkNS();
