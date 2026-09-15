import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

async function checkDNS() {
  console.log('--- CHECKING DKIM & SPF DNS RECORDS ---');
  
  try {
    const spf = await resolveTxt('mypainclinicglobal.com');
    console.log('SPF TXT Records:');
    spf.forEach(r => console.log(' -', r.join('')));
  } catch (err: any) {
    console.error('SPF Lookup Error:', err.message);
  }

  try {
    const dkim = await resolveTxt('default._domainkey.mypainclinicglobal.com');
    console.log('\nDKIM TXT Records (default._domainkey):');
    dkim.forEach(r => console.log(' -', r.join('')));
  } catch (err: any) {
    console.error('DKIM Lookup Error (default._domainkey):', err.message);
  }

  process.exit(0);
}

checkDNS();
