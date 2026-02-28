import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Log an audit event. Uses the current user session when available,
 * falls back to service client for server-side operations without a session
 * (e.g. registration). Pass `userId` explicitly when no session exists.
 */
export async function logAudit(params: {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  userId?: string;
}) {
  try {
    let userId = params.userId;

    // Try to get user from session if userId not provided
    if (!userId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {
        // No session available (e.g., during registration)
      }
    }

    // Use service client for insertion (audit_logs may have restricted RLS)
    const serviceClient = createServiceClient();
    await serviceClient.from("audit_logs").insert({
      user_id: userId || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      details: params.details || {},
      ip_address: params.ip || null,
      user_agent: params.userAgent || null,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
