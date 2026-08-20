const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to format date in DD/MM/YYYY
function formatDateDDMMYYYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

// Helper to format 24h time to 12h AM/PM
function formatTime12(tStr) {
  if (!tStr) return tStr;
  const [hStr, mStr] = tStr.split(':');
  if (!hStr || !mStr) return tStr;
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
}

async function getWhatsAppSettings() {
  const s = await prisma.payrollSetting.findUnique({ where: { key: 'whatsapp_gupshup_config' } });
  if (!s || !s.value) return { enabled: false };
  try {
    return JSON.parse(s.value);
  } catch {
    return { enabled: false };
  }
}

async function sendAttendanceWhatsAppNotification(payload) {
  const settings = await getWhatsAppSettings();
  if (!settings.enabled) return { success: false, message: 'WhatsApp disabled' };
  
  const type = payload.type;
  if (type === 'LOGIN' && !settings.notifyLogin) return { success: false, message: 'Login alerts disabled' };
  if (type === 'LOGOUT' && !settings.notifyLogout) return { success: false, message: 'Logout alerts disabled' };
  
  if (!payload.mobile || payload.mobile.trim() === '') return { success: false, message: 'No mobile number' };
  
  let formattedNumber = payload.mobile.replace(/[^0-9]/g, '');
  if (formattedNumber.length === 10) formattedNumber = '91' + formattedNumber;
  
  const templateId = type === 'LOGIN' ? settings.templateIdLogin : settings.templateIdLogout;
  if (!templateId || templateId.trim() === '') return { success: false, message: 'Template ID missing' };
  
  const templateParams = type === 'LOGIN'
    ? [payload.employeeName, payload.dateStr, payload.timeStr]
    : [payload.employeeName, payload.dateStr, payload.timeStr, (payload.workingHours || 0).toFixed(2)];
    
  try {
    const params = new URLSearchParams();
    params.append('channel', 'whatsapp');
    params.append('source', settings.sourceNumber.replace(/[^0-9]/g, ''));
    params.append('destination', formattedNumber);
    params.append('template', JSON.stringify({ id: templateId, params: templateParams }));
    if (settings.appName) params.append('src.name', settings.appName);
    
    const response = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': settings.apiKey,
      },
      body: params.toString(),
    });
    
    const resData = await response.json();
    if (response.ok && (resData.status === 'submitted' || resData.status === 'success')) {
      return { success: true, data: resData };
    }
    return { success: false, message: resData.message || 'Gupshup error' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function syncPunches() {
  console.log(`\n[${new Date().toLocaleString('en-IN')}] Starting Cloud Sync...`);
  
  try {
    // 1. Load settings from database
    const settingsList = await prisma.payrollSetting.findMany();
    const settings = {};
    for (const s of settingsList) {
      settings[s.key] = s.value;
    }
    
    const serverUrl = settings.realtime_cloud_url || 'http://realsoftcloud.com:85';
    const companyCode = settings.realtime_company_code || '';
    const username = settings.realtime_username || '';
    const password = settings.realtime_password || '';
    
    if (!companyCode || !username || !password) {
      console.warn('Realsoft Cloud credentials are not fully configured in settings page.');
      return;
    }
    
    // 2. Fetch today's punches
    const todayStr = new Date().toISOString().split('T')[0];
    const apiUrl = `${serverUrl.replace(/\/$/, '')}/api/v1/punches?company=${encodeURIComponent(companyCode)}&user=${encodeURIComponent(username)}&from=${todayStr}&to=${todayStr}`;
    
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`Realsoft Cloud API returned HTTP status ${res.status}`);
      return;
    }
    
    const json = await res.json();
    const punches = json.data || json.punches || json || [];
    console.log(`Fetched ${punches.length} punch logs from Cloud.`);
    
    // 3. Get active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
    });
    
    const biometricMap = new Map();
    for (const emp of employees) {
      const bio = emp.biometricId.trim();
      const empId = emp.employeeId.trim();
      const strippedBio = bio.replace(/^0+/, '') || bio;
      const strippedEmp = empId.replace(/^0+/, '') || empId;
      
      biometricMap.set(bio, emp);
      biometricMap.set(empId, emp);
      biometricMap.set(strippedBio, emp);
      biometricMap.set(strippedEmp, emp);
    }
    
    // Sort punches chronologically to ensure login triggers first
    punches.sort((a, b) => {
      const t1 = `${a.date}T${a.time}`;
      const t2 = `${b.date}T${b.time}`;
      return new Date(t1) - new Date(t2);
    });
    
    for (const p of punches) {
      const rawId = String(p.biometricId || '').trim();
      const strippedId = rawId.replace(/^0+/, '') || rawId;
      const employee = biometricMap.get(rawId) || biometricMap.get(strippedId);
      
      if (!employee) continue;
      
      const dateUtc = new Date(`${p.date}T00:00:00.000Z`);
      const timeStr = p.time.length === 5 ? `${p.time}:00` : p.time;
      
      // 4. Check duplicate raw punch
      const existing = await prisma.attendanceRaw.findFirst({
        where: {
          employeeId: employee.id,
          date: dateUtc,
          time: timeStr,
        },
      });
      
      if (existing) continue;
      
      console.log(`New punch detected: Employee "${employee.name}" | Time: ${timeStr}`);
      
      // 5. Save to AttendanceRaw
      await prisma.attendanceRaw.create({
        data: {
          employeeId: employee.id,
          date: dateUtc,
          time: timeStr,
          punchType: p.punchType || 'IN',
          source: 'REALTIME_CLOUD',
        },
      });
      
      // 6. Fetch or initialize today's AttendanceDaily
      const existingDaily = await prisma.attendanceDaily.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: dateUtc,
          },
        },
      });
      
      let isNewLogin = false;
      let isNewLogout = false;
      let firstIn = existingDaily?.firstIn || null;
      let lastOut = existingDaily?.lastOut || null;
      
      if (!firstIn) {
        firstIn = timeStr;
        isNewLogin = true;
      } else {
        lastOut = timeStr;
        isNewLogout = true;
      }
      
      // Calculate working hours
      let workingHours = Number(existingDaily?.workingHours || 0);
      if (firstIn && lastOut) {
        const [h1, m1] = firstIn.split(':').map(Number);
        const [h2, m2] = lastOut.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) {
          workingHours = parseFloat((mins / 60).toFixed(2));
        }
      }
      
      const status = firstIn ? 'PRESENT' : 'ABSENT';
      
      await prisma.attendanceDaily.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: dateUtc,
          },
        },
        update: { firstIn, lastOut, workingHours, status },
        create: { employeeId: employee.id, date: dateUtc, firstIn, lastOut, workingHours, status },
      });
      
      // 7. Trigger WhatsApp
      if (employee.mobile) {
        const dateFormatted = formatDateDDMMYYYY(dateUtc);
        
        if (isNewLogin && firstIn) {
          console.log(`Sending LOGIN alert to ${employee.name} (${employee.mobile})...`);
          const r = await sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGIN',
            dateStr: dateFormatted,
            timeStr: formatTime12(firstIn),
          });
          console.log(`LOGIN alert response:`, r.success ? 'Success' : `Failed: ${r.message}`);
        } else if (isNewLogout && lastOut) {
          console.log(`Sending LOGOUT alert to ${employee.name} (${employee.mobile})...`);
          const r = await sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGOUT',
            dateStr: dateFormatted,
            timeStr: formatTime12(lastOut),
            workingHours,
          });
          console.log(`LOGOUT alert response:`, r.success ? 'Success' : `Failed: ${r.message}`);
        }
      }
    }
    
  } catch (err) {
    console.error('Error in sync cycle:', err.message);
  }
}

// Poll every 3 minutes (180000 ms)
console.log('Automated Realtime Cloud Sync Daemon is running...');
syncPunches();
setInterval(syncPunches, 180000);
