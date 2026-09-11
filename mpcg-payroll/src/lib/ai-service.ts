import { prisma } from './prisma';

export interface AISettings {
  provider: 'groq' | 'openrouter' | 'nvidia' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
  systemPrompt?: string;
}

export const DEFAULT_AI_PROVIDERS = {
  groq: {
    name: 'Groq (Ultra-Fast & Free)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'groq/compound',
    popularModels: [
      { id: 'groq/compound', name: 'Groq Compound (Fast & Highly Intelligent - Recommended)' },
      { id: 'groq/compound-mini', name: 'Groq Compound Mini (Ultra-Fast)' },
      { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT OSS 120B' },
      { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT OSS 20B' },
      { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B' },
    ],
    getKeyUrl: 'https://console.groq.com/keys',
  },
  openrouter: {
    name: 'OpenRouter (Multi-Model Free & Paid)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    popularModels: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (Free)' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)' },
      { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct (Free)' },
    ],
    getKeyUrl: 'https://openrouter.ai/keys',
  },
  nvidia: {
    name: 'NVIDIA NIM (Enterprise Free Tier)',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    popularModels: [
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
      { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1' },
      { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2 Instruct' },
    ],
    getKeyUrl: 'https://build.nvidia.com/explore/discover',
  },
  custom: {
    name: 'Custom OpenAI-Compatible / Ollama / Local',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.3',
    popularModels: [
      { id: 'llama3.3', name: 'Llama 3.3' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
    ],
    getKeyUrl: '',
  },
};

/**
 * Fetch AI Settings from Database
 */
export async function getAISettings(): Promise<AISettings> {
  const settingsRecords = await prisma.payrollSetting.findMany({
    where: {
      key: {
        in: [
          'ai_provider',
          'ai_api_key',
          'ai_model',
          'ai_base_url',
          'ai_enabled',
          'ai_system_prompt',
        ],
      },
    },
  });

  const map = new Map<string, string>();
  settingsRecords.forEach((s) => map.set(s.key, s.value));

  const provider = (map.get('ai_provider') || 'groq') as AISettings['provider'];
  const defaultProviderMeta = DEFAULT_AI_PROVIDERS[provider] || DEFAULT_AI_PROVIDERS.groq;

  return {
    provider,
    apiKey: map.get('ai_api_key') || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || '',
    model: map.get('ai_model') || defaultProviderMeta.defaultModel,
    baseUrl: map.get('ai_base_url') || defaultProviderMeta.baseUrl,
    enabled: map.get('ai_enabled') === 'true' || !!process.env.GROQ_API_KEY || !!process.env.OPENROUTER_API_KEY,
    systemPrompt: map.get('ai_system_prompt') || '',
  };
}

/**
 * Call OpenAI-compatible LLM endpoint
 */
export async function callAICompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; maxTokens?: number; customConfig?: Partial<AISettings> }
): Promise<string> {
  const dbSettings = await getAISettings();
  const config = { ...dbSettings, ...options?.customConfig };

  if (!config.apiKey && config.provider !== 'custom') {
    throw new Error(`AI API Key is missing. Please configure your free ${config.provider.toUpperCase()} API key in Settings > AI.`);
  }

  const defaultMeta = DEFAULT_AI_PROVIDERS[config.provider] || DEFAULT_AI_PROVIDERS.groq;
  const baseUrl = (config.baseUrl || defaultMeta.baseUrl).replace(/\/+$/, '');
  const model = config.model || defaultMeta.defaultModel;

  const url = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'MPCG Payroll System';
  }

  let attempts = 0;
  const maxAttempts = 3;
  let activeModel = model;

  while (attempts < maxAttempts) {
    attempts++;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: activeModel,
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 1500,
      }),
    });

    if (response.status === 429 && attempts < maxAttempts) {
      const errorText = await response.text();
      const waitMatch = errorText.match(/try again in ([\d\.]+)s/i);
      const waitMs = waitMatch ? (parseFloat(waitMatch[1]) + 0.5) * 1000 : 2000;
      // Fall back to compound model if 120b hit limit
      if (activeModel.includes('120b')) {
        activeModel = 'groq/compound';
      }
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      let parsedErr = errorText;
      try {
        const errObj = JSON.parse(errorText);
        parsedErr = errObj.error?.message || errorText;
      } catch {
        // ignore
      }
      throw new Error(`AI Provider Error (${response.status}): ${parsedErr}`);
    }

    const data = await response.json();
    const messageObj = data.choices?.[0]?.message;
    let content = messageObj?.content;

    if (!content && messageObj?.reasoning) {
      content = messageObj.reasoning;
    }

    if (!content && typeof data.choices?.[0]?.text === 'string') {
      content = data.choices[0].text;
    }

    if (!content) {
      throw new Error('AI response was empty.');
    }

    return content;
  }

  throw new Error('AI request exceeded maximum attempts.');
}

/**
 * Test AI Connection
 */
export async function testAIConnection(config: AISettings): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const response = await callAICompletion(
      [
        { role: 'system', content: 'You are an AI assistant.' },
        { role: 'user', content: 'Respond with exactly: "AI connection successful."' },
      ],
      { temperature: 0.1, maxTokens: 250, customConfig: config }
    );
    const latencyMs = Date.now() - start;
    return {
      success: true,
      message: `Connected successfully to ${config.model} (${latencyMs}ms): ${response.trim()}`,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      message: error.message || 'Connection failed.',
      latencyMs,
    };
  }
}

/**
 * Fetch Live Models from Provider Endpoint
 */
export async function fetchAvailableAIModels(config: AISettings): Promise<Array<{ id: string; name: string }>> {
  const defaultMeta = DEFAULT_AI_PROVIDERS[config.provider] || DEFAULT_AI_PROVIDERS.groq;
  const baseUrl = (config.baseUrl || defaultMeta.baseUrl).replace(/\/+$/, '');

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return defaultMeta.popularModels;
    }

    const data = await response.json();
    if (Array.isArray(data.data) && data.data.length > 0) {
      return data.data
        .map((m: any) => ({
          id: m.id,
          name: m.id,
        }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    }
    return defaultMeta.popularModels;
  } catch {
    return defaultMeta.popularModels;
  }
}

const PAYROLL_SYSTEM_RULES = `
You are the MPCG Payroll & Salary Intelligence Engine.
You analyze payroll data using the company's exact production calculation rules:
1. Fixed 30 Days Base Divisor: Per-Day Salary = Basic Salary / 30.
2. Standard Hourly Rate = Per-Day Salary / 9 = Basic Salary / (30 * 9).
3. Paid Days = Present Days + Missing Punch Days + Weekly Offs + Holidays + Paid Leaves.
4. LOP Days = max(0, 30 - Paid Days - Paid Leave Adjustments).
5. Sandwich Leave Rule:
   - If an employee takes full leave (ABSENT / UNPAID_LEAVE) on Saturday AND Monday surrounding Sunday (Weekly Off), the intervening Sunday is automatically converted to an Unpaid LOP day.
   - Single-punch Missing Punch is treated as a present working day and does NOT trigger a sandwich penalty.
6. Base Earned Salary = Basic Salary - (LOP Days * Per-Day Salary) = (Paid Days * Per-Day Salary).
7. Under-time (Short Working Hours) Rule:
   - Average Daily Hours = Total Working Hours / Present Days.
   - Deducted ONLY if Average Daily Hours < 8.90 hours/day.
   - Shortfall Deduction = (Expected Hours - Total Hours) * Hourly Rate.
   - If Average >= 8.90h/day, Shortfall Deduction is ₹0.00 (allowed grace).
8. Overtime Rule:
   - Overtime is considered ONLY if Average Daily Hours >= 9.25 hours/day (9:15+).
   - OT Amount = Overtime Hours * Hourly Rate.
9. Joining Salary Hold: If applied (e.g. 15 days), Hold = 15 * Per-Day Salary.
10. Net Salary = Gross Salary (Basic + OT + Incentives) - (LOP + Short Hours + Hold + Advances + P.Tax + ESIC/PF).

Always be mathematically precise, professional, concise, and format outputs in clean GitHub-style Markdown.
`;

/**
 * Generate AI Salary Explanation for an Individual Employee
 */
export async function generateSalaryAIExplanation(payrollId: string): Promise<string> {
  const payroll = await prisma.monthlyPayroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: {
        include: {
          salaryStructures: { where: { isActive: true }, take: 1 },
        },
      },
    },
  });

  if (!payroll) {
    throw new Error('Payroll record not found.');
  }

  const emp = payroll.employee;
  const salary = emp.salaryStructures[0];
  const basic = Number(payroll.basicSalary || salary?.basicSalary || 0);
  const perDay = basic / 30;
  const hourly = perDay / 9;
  const pres = Number(payroll.presentDays);
  const totalHrs = Number((payroll as any).totalWorkingHours || 0);
  const avgHrs = pres > 0 ? (totalHrs / pres).toFixed(2) : '0';

  const contextData = {
    employeeName: emp.name,
    employeeCode: emp.employeeId,
    designation: emp.designation,
    department: emp.department,
    month: payroll.month,
    year: payroll.year,
    basicSalary: basic,
    perDayRate: perDay,
    hourlyRate: hourly,
    presentDays: pres,
    missingPunches: (payroll as any).missingPunchDays || 0,
    weeklyOffs: payroll.weeklyOffs,
    holidays: payroll.holidays,
    paidLeaves: payroll.paidLeaveDays,
    lopDays: Number(payroll.lopDays),
    lopDeduction: Number(payroll.lopDeduction),
    totalWorkingHours: totalHrs,
    expectedWorkingHours: pres * 9,
    averageDailyHours: avgHrs,
    shortWorkingHours: Number((payroll as any).shortWorkingHours || 0),
    shortHoursDeduction: Number((payroll as any).shortHoursDeduction || 0),
    overtimeHours: Number(payroll.overtimeHours),
    overtimeAmount: Number(payroll.overtimeAmount),
    joiningSalaryHold: Number((payroll as any).holdSalaryDeduction || 0),
    advanceDeduction: Number(payroll.advanceDeduction),
    professionalTax: 200,
    otherDeduction: Number(payroll.otherDeduction),
    totalDeduction: Number(payroll.totalDeduction),
    netSalary: Number(payroll.netSalary),
  };

  const prompt = `
Explain the salary calculation for employee **${emp.name}** for Month ${payroll.month}/${payroll.year}.

Here is the exact payroll data:
\`\`\`json
${JSON.stringify(contextData, null, 2)}
\`\`\`

Please provide:
1. **Executive Summary**: 2-sentence summary of net pay and why.
2. **Step-by-Step Math**:
   - Per-Day & Hourly Rate calculation.
   - Attendance & LOP explanation (Present + Missing Punches + Weekly Offs vs 30 days).
   - Working Hours Analysis (Average daily hours vs 8.90h grace threshold & 9:15 OT threshold).
   - Itemized Deductions (LOP, Short Hours, Joining Hold, P.Tax, etc.).
3. **Key Takeaway**: A single bullet point confirming if any adjustments or holds occurred.
`;

  return await callAICompletion([
    { role: 'system', content: PAYROLL_SYSTEM_RULES },
    { role: 'user', content: prompt },
  ]);
}

/**
 * Run Full AI Payroll Anomaly Audit for a Month
 */
export async function runPayrollAIAudit(month: number, year: number): Promise<string> {
  const payrolls = await prisma.monthlyPayroll.findMany({
    where: { month, year },
    include: {
      employee: {
        include: {
          salaryStructures: { where: { isActive: true }, take: 1 },
        },
      },
    },
    orderBy: { employee: { name: 'asc' } },
  });

  if (payrolls.length === 0) {
    return 'No payroll records found for this month.';
  }

  const summaryList = payrolls.map((p: any) => {
    const basic = Number(p.basicSalary);
    const pres = Number(p.presentDays);
    const totalHrs = Number(p.totalWorkingHours || 0);
    const avgHrs = pres > 0 ? (totalHrs / pres).toFixed(2) : '0';
    return {
      name: p.employee.name,
      code: p.employee.employeeId,
      basic,
      presentDays: pres,
      lopDays: Number(p.lopDays),
      lopDed: Number(p.lopDeduction),
      avgDailyHours: avgHrs,
      shortHrs: Number(p.shortWorkingHours || 0),
      shortDed: Number(p.shortHoursDeduction || 0),
      holdDed: Number(p.holdSalaryDeduction || 0),
      otAmount: Number(p.overtimeAmount),
      totalDed: Number(p.totalDeduction),
      netSalary: Number(p.netSalary),
      status: p.status,
    };
  });

  const prompt = `
Perform an exhaustive Payroll Health & Anomaly Audit for **Month ${month}/${year}** across all ${summaryList.length} employees.

Here is the payroll summary data:
\`\`\`json
${JSON.stringify(summaryList, null, 2)}
\`\`\`

Please output a structured Audit Report:
1. **Overall Health Score (0-100%)** & Quick Executive Summary.
2. **Critical Flags & Anomalies** (e.g. Negative Net Salaries, Heavy LOP > 10 days, Large Joining Holds, Short Hours deductions).
3. **Attendance & Hours Insights** (Employees with low average daily hours < 8.90h, overtime beneficiaries).
4. **Actionable Recommendations** for HR/Admin before finalizing payroll.
`;

  return await callAICompletion([
    { role: 'system', content: PAYROLL_SYSTEM_RULES },
    { role: 'user', content: prompt },
  ]);
}

/**
 * Interactive Q&A with AI on Monthly Payroll
 */
export async function chatWithPayrollAI(question: string, month: number, year: number): Promise<string> {
  const payrolls = await prisma.monthlyPayroll.findMany({
    where: { month, year },
    include: {
      employee: true,
    },
    orderBy: { employee: { name: 'asc' } },
  });

  const payrollSnapshot = payrolls.map((p: any) => ({
    name: p.employee.name,
    code: p.employee.employeeId,
    basic: Number(p.basicSalary),
    presDays: Number(p.presentDays),
    lopDays: Number(p.lopDays),
    lopDed: Number(p.lopDeduction),
    shortHrs: Number(p.shortWorkingHours || 0),
    shortDed: Number(p.shortHoursDeduction || 0),
    holdDed: Number(p.holdSalaryDeduction || 0),
    otAmount: Number(p.overtimeAmount),
    totalDed: Number(p.totalDeduction),
    netSalary: Number(p.netSalary),
  }));

  const prompt = `
Question from Admin: "${question}"

Current Payroll Data for Month ${month}/${year} (${payrolls.length} employees):
\`\`\`json
${JSON.stringify(payrollSnapshot, null, 2)}
\`\`\`

Answer the question accurately based on this payroll data. If referring to specific employees, include their name, basic, and relevant amounts.
`;

  return await callAICompletion([
    { role: 'system', content: PAYROLL_SYSTEM_RULES },
    { role: 'user', content: prompt },
  ]);
}
