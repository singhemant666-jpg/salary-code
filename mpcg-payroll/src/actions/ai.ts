'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  getAISettings,
  testAIConnection,
  generateSalaryAIExplanation,
  runPayrollAIAudit,
  chatWithPayrollAI,
  AISettings,
} from '@/lib/ai-service';

/**
 * Fetch Current AI Settings
 */
export async function getAISettingsAction(): Promise<{ success: boolean; data?: AISettings; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }
    const settings = await getAISettings();
    return { success: true, data: settings };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to fetch AI settings.' };
  }
}

/**
 * Save AI Settings
 */
export async function saveAISettingsAction(settings: AISettings): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Only Super Admin can update AI settings.' };
    }

    const entries = [
      { key: 'ai_provider', value: settings.provider },
      { key: 'ai_api_key', value: settings.apiKey.trim() },
      { key: 'ai_model', value: settings.model.trim() },
      { key: 'ai_base_url', value: settings.baseUrl?.trim() || '' },
      { key: 'ai_enabled', value: settings.enabled ? 'true' : 'false' },
      { key: 'ai_system_prompt', value: settings.systemPrompt || '' },
    ];

    for (const entry of entries) {
      await prisma.payrollSetting.upsert({
        where: { key: entry.key },
        update: { value: entry.value, category: 'ai' },
        create: { key: entry.key, value: entry.value, category: 'ai', description: `AI Setting: ${entry.key}` },
      });
    }

    revalidatePath('/dashboard/settings/ai');
    revalidatePath('/dashboard/payroll');

    return { success: true, message: 'AI settings saved successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to save AI settings.' };
  }
}

/**
 * Test AI Connection
 */
export async function testAIConnectionAction(settings: AISettings) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized', latencyMs: 0 };
    }
    return await testAIConnection(settings);
  } catch (error: any) {
    return { success: false, message: error.message || 'Connection test failed.', latencyMs: 0 };
  }
}

/**
 * Fetch Live Models
 */
export async function fetchAvailableAIModelsAction(settings: AISettings) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, models: [] };
    }
    const { fetchAvailableAIModels } = await import('@/lib/ai-service');
    const models = await fetchAvailableAIModels(settings);
    return { success: true, models };
  } catch {
    return { success: false, models: [] };
  }
}

/**
 * Generate AI Salary Explanation
 */
export async function explainSalaryAction(payrollId: string): Promise<{ success: boolean; explanation?: string; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }

    const explanation = await generateSalaryAIExplanation(payrollId);
    return { success: true, explanation };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to generate salary explanation.' };
  }
}

/**
 * Run Full AI Payroll Anomaly Audit
 */
export async function runPayrollAuditAction(month: number, year: number): Promise<{ success: boolean; report?: string; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }

    const report = await runPayrollAIAudit(month, year);
    return { success: true, report };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to run payroll audit.' };
  }
}

/**
 * Chat with Payroll AI Assistant
 */
export async function askPayrollAIAction(
  question: string,
  month: number,
  year: number
): Promise<{ success: boolean; answer?: string; message?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized' };
    }

    const answer = await chatWithPayrollAI(question, month, year);
    return { success: true, answer };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to query AI assistant.' };
  }
}
