# Attendance Corrections API Draft

Base URL: `/attendance-corrections` (requires Bearer token)

## Policy

### GET `/attendance-corrections/policy`
- Roles: `employee`, `admin`
- Purpose: Retrieve active missed-punch correction policy.

Response example:
```json
{
  "id": "uuid",
  "org_key": "default",
  "submission_window_days": 7,
  "monthly_quota_per_employee": 3,
  "requires_evidence_after_hours": 4,
  "auto_approve_max_minutes_delta": 15,
  "payroll_lock_days": 10,
  "admin_override_enabled": true
}
```

### PATCH `/attendance-corrections/policy`
- Roles: `admin`
- Purpose: Update policy values.

Request body (all fields optional):
```json
{
  "submissionWindowDays": 7,
  "monthlyQuotaPerEmployee": 3,
  "requiresEvidenceAfterHours": 4,
  "autoApproveMaxMinutesDelta": 15,
  "payrollLockDays": 10,
  "adminOverrideEnabled": true
}
```

## Correction Requests

### POST `/attendance-corrections`
- Roles: `employee`, `admin`
- Purpose: Submit missed-punch correction.

Request body:
```json
{
  "attendanceDate": "2026-03-15",
  "eventType": "clock_out",
  "requestedTimestamp": "2026-03-15T18:05:00.000Z",
  "reason": "Client call overtime",
  "evidenceUrl": "https://.../proof.png",
  "overrideReason": "Payroll confirmed by HR"
}
```

Behavior summary:
- Validates submission window, payroll lock, monthly quota, and duplicate pending request.
- Auto-approves when policy allows, otherwise routes to approver/delegate.

### GET `/attendance-corrections`
- Roles: `employee`, `admin`
- Purpose: List correction requests.
- Query:
  - `userId` (admin only)
  - `status` (optional)

### GET `/attendance-corrections/pending-approvals`
- Roles: `employee`, `admin`
- Purpose: List correction requests waiting for the current user to approve.

### POST `/attendance-corrections/:id/decision`
- Roles: `employee`, `admin`
- Purpose: Approver decision for correction request.

Request body:
```json
{
  "decision": "approved",
  "comment": "Evidence verified"
}
```

### PATCH `/attendance-corrections/:id/cancel`
- Roles: `employee`, `admin`
- Purpose: Cancel own correction request in `submitted` or `pending_approval` state.

## Unified Approvals Queue

### GET `/approvals/pending`
Now includes `attendance_correction` items in addition to `leave` and `overtime`.

Correction item shape:
```json
{
  "type": "attendance_correction",
  "id": "uuid",
  "user_id": "uuid",
  "start_at": "2026-03-15T18:05:00.000Z",
  "end_at": "2026-03-15T18:05:00.000Z",
  "reason": "Client call overtime",
  "status": "pending_approval",
  "created_at": "2026-03-16T02:00:00.000Z",
  "attendance_date": "2026-03-15",
  "event_type": "clock_out"
}
```

### POST `/approvals/attendance-corrections/:id/decision`
- Roles: `employee`, `admin`
- Purpose: Approver decision entrypoint via approvals namespace.

Request body:
```json
{
  "decision": "rejected",
  "comment": "Need clearer evidence"
}
```
