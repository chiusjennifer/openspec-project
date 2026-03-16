import { query } from "../db/client.js";

export async function resolveApprover(userId: string, referenceDate: string): Promise<string | null> {
  const baseResult = await query<{ approver_id: string | null }>(
    `SELECT approver_id FROM user_approvers WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  const baseApproverId = baseResult.rows[0]?.approver_id ?? null;
  if (!baseApproverId) {
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
