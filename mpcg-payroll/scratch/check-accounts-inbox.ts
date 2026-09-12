import Imap from 'node-imap';
import { simpleParser } from 'mailparser';

async function checkInbox() {
  console.log('--- CHECKING INBOX / BOUNCE MESSAGES FOR accounts@mypainclinicglobal.com ---');

  const imap = new Imap({
    user: 'accounts@mypainclinicglobal.com',
    password: 'mpc@acc1988',
    host: 'mail.mypainclinicglobal.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });

  imap.once('ready', () => {
    console.log('✅ IMAP Connection Established!');
    imap.openBox('INBOX', true, (err, box) => {
      if (err) {
        console.error('Failed to open INBOX:', err);
        imap.end();
        return;
      }

      console.log(`Total messages in INBOX: ${box.messages.total}`);
      if (box.messages.total === 0) {
        console.log('No messages found in INBOX.');
        imap.end();
        return;
      }

      const fetchCount = Math.min(10, box.messages.total);
      const fetchRange = `${box.messages.total - fetchCount + 1}:${box.messages.total}`;

      const f = imap.seq.fetch(fetchRange, { bodies: '' });
      f.on('message', (msg, seqno) => {
        msg.on('body', (stream) => {
          simpleParser(stream, (parseErr, parsed) => {
            if (parseErr) return;
            console.log(`\n--- Message #${seqno} ---`);
            console.log('Date:', parsed.date);
            console.log('From:', parsed.from?.text);
            console.log('Subject:', parsed.subject);
            console.log('Text Snippet:', parsed.text?.substring(0, 300));
          });
        });
      });

      f.once('end', () => {
        setTimeout(() => {
          imap.end();
        }, 3000);
      });
    });
  });

  imap.once('error', (err: any) => {
    console.error('❌ IMAP Error:', err.message);
  });

  imap.once('end', () => {
    console.log('\nIMAP connection closed.');
    process.exit(0);
  });

  imap.connect();
}

checkInbox();
