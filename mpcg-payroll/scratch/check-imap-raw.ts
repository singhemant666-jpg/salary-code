import tls from 'tls';

async function checkImapRaw() {
  console.log('--- CONNECTING TO IMAP (mail.mypainclinicglobal.com:993) ---');

  const socket = tls.connect({
    host: 'mail.mypainclinicglobal.com',
    port: 993,
    rejectUnauthorized: false,
  });

  socket.setEncoding('utf8');

  let step = 0;

  socket.on('data', (data: string) => {
    console.log('SERVER:', data.trim());

    if (step === 0 && data.includes('* OK')) {
      step = 1;
      console.log('CLIENT: Sending LOGIN...');
      socket.write('A1 LOGIN accounts@mypainclinicglobal.com mpc@acc1988\r\n');
    } else if (step === 1 && data.includes('A1 OK')) {
      step = 2;
      console.log('CLIENT: Selecting INBOX...');
      socket.write('A2 SELECT INBOX\r\n');
    } else if (step === 2 && data.includes('A2 OK')) {
      step = 3;
      console.log('CLIENT: Searching IMAP for bounce messages...');
      socket.write('A3 SEARCH TEXT "Mail Delivery"\r\n');
    } else if (step === 3 && data.includes('A3 OK')) {
      console.log('CLIENT: Logging out...');
      socket.write('A4 LOGOUT\r\n');
    }
  });

  socket.on('end', () => {
    console.log('Connection closed.');
    process.exit(0);
  });

  socket.on('error', (err) => {
    console.error('Socket Error:', err);
    process.exit(1);
  });
}

checkImapRaw();
