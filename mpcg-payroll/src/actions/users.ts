'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import bcrypt from 'bcryptjs';

/**
 * Create a new user (Super Admin access required)
 */
export async function createUser(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'Unauthorized. Super Admin access required.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const role = (formData.get('role') as any) || 'HR_ADMIN';
  const status = (formData.get('status') as any) || 'ACTIVE';

  if (!name || !email || !password) {
    return { success: false, message: 'Name, Email, and Password are required.' };
  }

  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, message: 'A user with this email address already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status,
      },
    });

    revalidatePath('/dashboard/settings/users');
    return { success: true, message: `User "${name}" created successfully!` };
  } catch (error: any) {
    console.error('Create user error:', error);
    return { success: false, message: error.message || 'Failed to create user' };
  }
}

/**
 * Update an existing user details, email, role, status, and/or password
 */
export async function updateUser(userId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'Unauthorized. Super Admin access required.' };
  }

  if (!userId) {
    return { success: false, message: 'User ID is required.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const role = (formData.get('role') as any) || 'HR_ADMIN';
  const status = (formData.get('status') as any) || 'ACTIVE';

  if (!name || !email) {
    return { success: false, message: 'Name and Email are required.' };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    // Check email uniqueness if email is changed
    const emailCheck = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (emailCheck) {
      return { success: false, message: 'This email address is already in use by another user.' };
    }

    const updateData: any = {
      name,
      email,
      role,
      status,
    };

    // If new password is provided, hash and update it
    if (password && password.trim() !== '') {
      if (password.trim().length < 6) {
        return { success: false, message: 'New password must be at least 6 characters long.' };
      }
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath('/dashboard/settings/users');
    return { success: true, message: `User "${name}" updated successfully!` };
  } catch (error: any) {
    console.error('Update user error:', error);
    return { success: false, message: error.message || 'Failed to update user' };
  }
}

/**
 * Delete a user (Super Admin access required)
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'Unauthorized. Super Admin access required.' };
  }

  if (session.user.id === userId) {
    return { success: false, message: 'You cannot delete your own logged-in account.' };
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath('/dashboard/settings/users');
    return { success: true, message: 'User deleted successfully!' };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return { success: false, message: error.message || 'Failed to delete user' };
  }
}

/**
 * Block or Unblock a user (Super Admin access required)
 */
export async function toggleUserStatus(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'Unauthorized. Super Admin access required.' };
  }

  if (session.user.id === userId) {
    return { success: false, message: 'You cannot block your own logged-in account.' };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    revalidatePath('/dashboard/settings/users');
    return {
      success: true,
      message: newStatus === 'INACTIVE'
        ? `User "${targetUser.name}" has been BLOCKED. They can no longer log into the system.`
        : `User "${targetUser.name}" has been UNBLOCKED and activated.`,
    };
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    return { success: false, message: error.message || 'Failed to toggle user status' };
  }
}
