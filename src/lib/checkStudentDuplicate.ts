// lib/checkStudentDuplicate.ts
//
// Pre-registration duplicate check. Call this BEFORE supabase.auth.signUp so
// you can block the form with a clear message ("Student ID already registered"
// / "Email already registered") instead of letting Auth fail generically.
//
// Requires student-duplicate-prevention.sql to have been run (adds the
// student_id column + unique indexes + lets the anon role read profiles).

import { supabase } from '@/lib/supabase';

export type DuplicateCheckResult = {
  duplicate: boolean;
  field: 'student_id' | 'email' | null;
  message: string;
};

export async function checkStudentDuplicate(
  studentId: string,
  email: string
): Promise<DuplicateCheckResult> {
  const cleanId = studentId.trim();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check Student ID (if provided).
  if (cleanId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('student_id', cleanId)
      .maybeSingle();
    if (error) {
      // Most likely cause: the student_id column isn't there yet.
      if (/column|42703/i.test(error.message)) {
        return {
          duplicate: false,
          field: null,
          message:
            'Duplicate check skipped — run student-duplicate-prevention.sql in Supabase first.',
        };
      }
      return { duplicate: false, field: null, message: error.message };
    }
    if (data) {
      return {
        duplicate: true,
        field: 'student_id',
        message: `Student ID "${cleanId}" is already registered. Each student may only have one account.`,
      };
    }
  }

  // 2. Check email.
  if (cleanEmail) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (error) {
      return { duplicate: false, field: null, message: error.message };
    }
    if (data) {
      return {
        duplicate: true,
        field: 'email',
        message: `Email "${cleanEmail}" is already registered. Use a different email or log in to your existing account.`,
      };
    }
  }

  return { duplicate: false, field: null, message: '' };
}
