import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

/**
 * Logs an admin action to the audit_logs table.
 * Fire-and-forget — never throws, so it won't break the main action.
 */
export async function logAuditAction(params: {
  action: string;
  target_type: string;
  target_id?: string;
  target_name?: string;
  details?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      admin_email: profile?.email || user.email || '',
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id || null,
      target_name: params.target_name || null,
      details: params.details || null,
    });
  } catch (err) {
    console.warn('⚠️ Audit log failed (non-blocking):', err);
  }
}