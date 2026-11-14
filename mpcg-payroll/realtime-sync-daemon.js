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


function parseTimeToMinutes(tStr) {
  if (!tStr) return null;
  const match = tStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[4] ? match[4].toUpperCase() : null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function isNearShiftEnd(currentTimeStr, shiftEndTimeStr, windowMinutesBefore = 45) {
  if (!currentTimeStr || !shiftEndTimeStr) return false;
  const currentMins = parseTimeToMinutes(currentTimeStr);
  const shiftEndMins = parseTimeToMinutes(shiftEndTimeStr);
  if (currentMins === null || shiftEndMins === null) return false;

  if (shiftEndMins >= 360) {
    return currentMins >= (shiftEndMins - windowMinutesBefore) && currentMins <= Math.min(1439, shiftEndMins + 300);
  }
  return currentMins >= (shiftEndMins - windowMinutesBefore);
}

function isShiftActuallyCompleted(payload) {
  const hours = Number(payload.workingHours || 0);
  const stdHours = Number(payload.standardWorkingHours || 9);
  const currentMins = parseTimeToMinutes(payload.timeStr);

  if (currentMins === null) {
    return { completed: hours >= stdHours - 1.5, reason: `Fallback check on hours (${hours} hrs)` };
  }

  // 1. FULL SHIFT: If employee completed standard shift duration minus 45 mins (e.g. >= 8.25h for 9h shift)
  if (hours >= Math.max(4.0, stdHours - 0.75)) {
    return { completed: true, reason: `Completed full shift (${hours.toFixed(2)} hrs >= ${(stdHours - 0.75).toFixed(2)}h)` };
  }

  // Scheduled and Login times
  const loginMins = parseTimeToMinutes(payload.loginTime);
  const scheduledStartMins = parseTimeToMinutes(payload.shiftStartTime) ?? (9 * 60);  // 09:00 AM (540)
  const scheduledEndMins = parseTimeToMinutes(payload.shiftEndTime) ?? (18 * 60);    // 06:00 PM (1080)

  // 2. SCHEDULED HALF-DAY PROFILE (e.g. Part-time / Half-day employee with stdHours <= 5.5h)
  const isScheduledHalfDay = stdHours <= 5.5;
  if (isScheduledHalfDay) {
    if (hours >= Math.max(3.5, stdHours - 0.75) && currentMins >= (scheduledEndMins - 30)) {
      return { completed: true, reason: `Scheduled half-day shift completed (${hours.toFixed(2)} hrs worked)` };
    }
  }

  // FOR FULL-TIME EMPLOYEES (stdHours >= 6.0):
  // Rule: Do NOT trigger at lunch or tea breaks (< 6.5 - 7.0 hrs worked)!

  // Minimum threshold to qualify as an early evening checkout
  const minFullTimeHours = Math.max(6.5, stdHours - 2.0); // e.g. 7.0 hrs for 9h shift

  // How many minutes late was the arrival?
  const arrivalLateMins = loginMins !== null ? Math.max(0, loginMins - scheduledStartMins) : 0;

  // Dynamic Shift End (when the employee is expected to complete standard hours)
  const dynamicShiftEndMins = arrivalLateMins > 45 && loginMins !== null
    ? loginMins + Math.round(stdHours * 60)
    : scheduledEndMins;

  // 3. Evening Checkout Condition:
  // If employee has worked at least 7.0 hours (for 9h shift) AND:
  // - It is past clinic shift end (>= scheduledEndMins - 15, e.g. >= 05:45 PM / 17:45), OR
  // - It is near dynamic shift end (>= dynamicShiftEndMins - 45)
  const isEveningTime = currentMins >= (scheduledEndMins - 15);
  const isNearDynamicEnd = currentMins >= (dynamicShiftEndMins - 45);

  if (hours >= minFullTimeHours && (isEveningTime || isNearDynamicEnd)) {
    return {
      completed: true,
      reason: `Evening shift departure: worked ${hours.toFixed(2)} hrs (>= ${minFullTimeHours.toFixed(2)}h) at ${payload.timeStr}`,
    };
  }

  // Otherwise, it is a mid-shift door access (lunch, tea, stepping out)
  return {
    completed: false,
    reason: `Mid-shift door access: worked ${hours.toFixed(2)} hrs (< ${minFullTimeHours.toFixed(2)}h min or before evening ${Math.floor(scheduledEndMins / 60)}:${String(scheduledEndMins % 60).padStart(2, '0')})`,
  };
}

const sentNotificationCache = new Map();


async function sendAttendanceWhatsAppNotification(payload) {
  const settings = await getWhatsAppSettings();
  if (!settings.enabled) return { success: false, message: 'WhatsApp disabled' };
  
  const type = payload.type;
  if (type === 'LOGIN' && !settings.notifyLogin) return { success: false, message: 'Login alerts disabled' };
  if (type === 'LOGOUT' && !settings.notifyLogout) return { success: false, message: 'Logout alerts disabled' };
  
  if (!payload.mobile || payload.mobile.trim() === '') return { success: false, message: 'No mobile number' };
  
  let cleanMobile = payload.mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
  const now = Date.now();

  // Guard 1: Only 1 LOGIN alert per day
  if (type === 'LOGIN') {
    const loginKey = `LOGIN_${cleanMobile}_${payload.dateStr}`;
    if (sentNotificationCache.has(loginKey)) {
      console.log(`[Daemon Guard] Skipped duplicate LOGIN for ${payload.employeeName} (${cleanMobile}) on ${payload.dateStr}`);
      return { success: true, message: 'Skipped duplicate LOGIN' };
    }
  }

  // Guard 2: Deduplication & Resend Rule: Prevent duplicates, but ALLOW resending if employee stayed and worked significantly more (> 30 mins)
  if (type === 'LOGOUT') {
    const logoutKey = `LOGOUT_${cleanMobile}_${payload.dateStr}`;
    const existingAlert = sentNotificationCache.get(logoutKey);

    if (existingAlert) {
      const prevHours = typeof existingAlert === 'object' ? (existingAlert.workingHours || 0) : 0;
      const prevSentAt = typeof existingAlert === 'object' ? existingAlert.sentAt : Number(existingAlert);
      const hoursGained = (payload.workingHours || 0) - prevHours;
      const timePassedMs = now - prevSentAt;

      // Allow updated logout alert if employee worked >= 30 mins more AND at least 20 mins passed
      if (hoursGained >= 0.5 && timePassedMs >= 20 * 60 * 1000) {
        console.log(`[Daemon Guard] Employee ${payload.employeeName} stayed longer (+${hoursGained.toFixed(2)}h, now ${payload.workingHours}h). Sending updated LOGOUT alert for ${payload.timeStr}.`);
      } else {
        console.log(`[Daemon Guard] Skipped duplicate/minor LOGOUT for ${payload.employeeName} (${cleanMobile}) on ${payload.dateStr} (already sent at ${typeof existingAlert === 'object' ? existingAlert.timeStr : 'earlier'})`);
        return { success: true, message: 'Skipped duplicate LOGOUT' };
      }
    }
  }

  // Guard 3: Smart Shift-End & Door-Access Filter (suppress mid-day door access punches e.g. lunch/tea breaks)
  if (type === 'LOGOUT') {
    const check = isShiftActuallyCompleted({
      timeStr: payload.timeStr,
      workingHours: payload.workingHours,
      loginTime: payload.loginTime,
      shiftStartTime: payload.shiftStartTime,
      shiftEndTime: payload.shiftEndTime,
      standardWorkingHours: payload.standardWorkingHours,
    });

    if (!check.completed) {
      console.log(`[Daemon Guard] Suppressed LOGOUT alert for ${payload.employeeName} (${cleanMobile}): ${check.reason}`);
      return { success: true, message: `Suppressed LOGOUT notification (${check.reason})` };
    }
  }

  // Guard 4: 10 minute cooldown for LOGOUT
  if (type === 'LOGOUT') {
    const lastLogoutKey = `LOGOUT_${cleanMobile}`;
    const lastSentTime = Number(sentNotificationCache.get(lastLogoutKey) || 0);
    if (now - lastSentTime < 10 * 60 * 1000) {
      console.log(`[Daemon Guard] Cooldown active for ${payload.employeeName}. Skipped duplicate LOGOUT.`);
      return { success: true, message: 'Skipped LOGOUT (cooldown active)' };
    }
  }
  
  const templateId = type === 'LOGIN' ? settings.templateIdLogin : settings.templateIdLogout;
  if (!templateId || templateId.trim() === '') return { success: false, message: 'Template ID missing' };
  
  const lateStr = (payload.lateMinutes && payload.lateMinutes > 0) ? `Late by ${payload.lateMinutes} mins` : 'On Time';
  const templateParams = type === 'LOGIN'
    ? [payload.employeeName, payload.dateStr, payload.timeStr, lateStr]
    : (() => {
        const totalWorkingMins = Math.round((payload.workingHours || 0) * 60);
        const wHours = Math.floor(totalWorkingMins / 60);
        const wMins = totalWorkingMins % 60;
        const workingHoursHHMM = `${wHours}.${String(wMins).padStart(2, '0')}`;
        return [payload.employeeName, payload.dateStr, payload.timeStr, workingHoursHHMM];
      })();
    
  try {
    const params = new URLSearchParams();
    params.append('channel', 'whatsapp');
    params.append('source', settings.sourceNumber.replace(/[^0-9]/g, ''));
    params.append('destination', cleanMobile);
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
      if (type === 'LOGIN') sentNotificationCache.set(`LOGIN_${cleanMobile}_${payload.dateStr}`, now);
      if (type === 'LOGOUT') {
        sentNotificationCache.set(`LOGOUT_${cleanMobile}_${payload.dateStr}`, {
          sentAt: now,
          timeStr: payload.timeStr,
          workingHours: payload.workingHours || 0,
        });
        sentNotificationCache.set(`LOGOUT_${cleanMobile}`, now);
      }
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
        const [h1, m1] = firstIn.split(':').map(Number);
        const [h2, m2] = timeStr.split(':').map(Number);
        const minsDiff = (h2 * 60 + m2) - (h1 * 60 + m1);

        if (minsDiff >= 15) {
          if (!lastOut || lastOut !== timeStr) {
            lastOut = timeStr;
            isNewLogout = true;
          }
        }
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
      
      // 7. Trigger WhatsApp ONLY if punch is live (occurred in the last 15 minutes)
      const punchDateTime = new Date(`${p.date}T${timeStr}`);
      const nowMs = Date.now();
      const minsAgo = !isNaN(punchDateTime.getTime()) ? (nowMs - punchDateTime.getTime()) / (1000 * 60) : 0;
      const isLivePunch = minsAgo >= -5 && minsAgo <= 15;

      if (employee.mobile && isLivePunch) {
        const dateFormatted = formatDateDDMMYYYY(dateUtc);
        
        if (isNewLogin && firstIn) {
          console.log(`Sending LIVE LOGIN alert to ${employee.name} (${employee.mobile})...`);
          const r = await sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGIN',
            dateStr: dateFormatted,
            timeStr: formatTime12(firstIn),
          });
          console.log(`LOGIN alert response:`, r.success ? 'Success' : `Failed: ${r.message}`);
        } else if (isNewLogout && lastOut) {
          console.log(`Sending LIVE LOGOUT alert to ${employee.name} (${employee.mobile})...`);
          const r = await sendAttendanceWhatsAppNotification({
            employeeName: employee.name,
            mobile: employee.mobile,
            type: 'LOGOUT',
            dateStr: dateFormatted,
            timeStr: formatTime12(lastOut),
            workingHours,
            loginTime: firstIn,
            shiftStartTime: employee.shiftStartTime,
            shiftEndTime: employee.shiftEndTime,
            standardWorkingHours: employee.standardWorkingHours,
          });
          console.log(`LOGOUT alert response:`, r.success ? 'Success' : `Failed: ${r.message}`);
        }
      } else if (employee.mobile && !isLivePunch) {
        console.log(`Skipped WhatsApp for historical punch of ${employee.name} (${timeStr}, ${Math.round(minsAgo)} mins ago).`);
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
