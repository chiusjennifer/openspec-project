import { query } from "../db/client.js";

export async function resolveApprover(userId: string, referenceDate: string): Promise<string | null> {
  const adminResult = await query<{ id: string }>(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'admin'
       AND u.is_active = TRUE
     ORDER BY u.created_at ASC
     LIMIT 1`
  );
  const baseApproverId = adminResult.rows[0]?.id ?? null;
  if (!baseApproverId || baseApproverId === userId) {
    return null;
  }

  const delegationResult = await query<{ delegate_user_id: string }>(
    `SELECT delegate_user_id
     FROM delegations
     WHERE approver_id = $1
       AND is_active = TRUE
       AND start_date <= $2::date
       AND end_date >= $2::date
     ORDER BY created_at DESC
     LIMIT 1`,
    [baseApproverId, referenceDate]
  );

  return delegationResult.rows[0]?.delegate_user_id ?? baseApproverId;
}
