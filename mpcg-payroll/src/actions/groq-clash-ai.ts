'use server';

export interface DoctorShiftInfo {
  name: string;
  employeeId?: string;
  department?: string | null;
  shiftStart?: string;
  shiftEnd?: string;
  skills: string[];
  leaveDates?: string;
}

export interface GroqClashRequest {
  clashDates: string;
  clashingDoctors: DoctorShiftInfo[];
  availableDoctors: DoctorShiftInfo[];
  affectedSkills: string[];
}

export interface GroqClashResult {
  success: boolean;
  source: 'groq' | 'local';
  model?: string;
  shortSummary: string;
  actions: Array<{
    icon: string;
    title: string;
    instruction: string;
  }>;
  message?: string;
}

export async function getGroqDoctorArrangement(
  params: GroqClashRequest
): Promise<GroqClashResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      source: 'local',
      shortSummary: 'Groq API key not configured in .env',
      actions: [],
    };
  }

  const clashingDesc = params.clashingDoctors
    .map(
      (d) =>
        `• Dr. ${d.name} (${d.department || 'Physiotherapy'}): Shift ${d.shiftStart || '09:00'} - ${d.shiftEnd || '18:00'}, Skills: [${d.skills.join(', ') || 'General Physio'}], Leave: ${d.leaveDates || params.clashDates}`
    )
    .join('\n');

  const availableDesc = params.availableDoctors
    .slice(0, 8)
    .map(
      (d) =>
        `• Dr. ${d.name}: Shift ${d.shiftStart || '09:00'} - ${d.shiftEnd || '18:00'}, Skills: [${d.skills.join(', ') || 'General Physio'}]`
    )
    .join('\n');

  const prompt = `You are a clinic operations assistant for a Physiotherapy department. Doctors/Physiotherapists are on leave at the same time causing a coverage clash.
Conflict Dates: ${params.clashDates}
Deficit Services: ${params.affectedSkills.join(', ') || 'General Physiotherapy'}

PHYSIOTHERAPISTS ON LEAVE (CLASHING):
${clashingDesc}

ACTIVE PHYSIOTHERAPISTS AVAILABLE ON THESE DATES:
${availableDesc}

TASK:
Provide 2 ultra-short, simple, actionable suggestions to resolve the clash internally.
CRITICAL RULES:
- ONLY recommend active physiotherapists from the available list above. Do NOT suggest non-physiotherapists or unlisted names.
- Keep each point to 1 direct, plain English sentence (e.g. asking a physiotherapist to come at 09:00 AM instead of 12:00 PM, or requesting one doctor to shift leave).
- No medical jargon or long explanations.

Respond strictly in valid JSON format:
{
  "shortSummary": "1 short sentence diagnosing the conflict and shortage",
  "actions": [
    {
      "icon": "⚡",
      "title": "Short title (e.g. Early Shift Request: Dr. Name)",
      "instruction": "1 direct sentence: who to ask and what exact shift change to request."
    },
    {
      "icon": "📅",
      "title": "Short title (e.g. Leave Reschedule: Dr. Name)",
      "instruction": "1 direct sentence instruction."
    }
  ]
}`;

  try {
    const modelsToTry = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a professional clinic staffing coordinator. Return ONLY valid JSON with keys "shortSummary" and "actions". Keep all answers ultra-short and practical.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 450,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = errText;
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) continue;

        const parsed = JSON.parse(content);
        return {
          success: true,
          source: 'groq',
          model,
          shortSummary: parsed.shortSummary || 'Shortage managed via doctor shift adjustment.',
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        };
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    throw new Error(lastError || 'Groq request failed across candidate models');
  } catch (err: any) {
    console.error('Groq AI error:', err);
    return {
      success: false,
      source: 'local',
      shortSummary: 'Could not fetch from Groq AI. Falling back to local arrangement engine.',
      actions: [],
      message: err?.message || 'Groq API request error',
    };
  }
}
