CREATE TABLE attendance_correction_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_key TEXT NOT NULL UNIQUE DEFAULT 'default',
  submission_window_days INTEGER NOT NULL DEFAULT 7 CHECK (submission_window_days > 0),
  monthly_quota_per_employee INTEGER NOT NULL DEFAULT 3 CHECK (monthly_quota_per_employee >= 0),
  requires_evidence_after_hours INTEGER NOT NULL DEFAULT 4 CHECK (requires_evidence_after_hours >= 0),
  auto_approve_max_minutes_delta INTEGER NOT NULL DEFAULT 15 CHECK (auto_approve_max_minutes_delta >= 0),
  payroll_lock_days INTEGER NOT NULL DEFAULT 10 CHECK (payroll_lock_days >= 0),
  admin_override_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  attendance_record_id UUID REFERENCES attendance_records(id),
  attendance_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  requested_timestamp TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'auto_approved', 'pending_approval', 'approved', 'rejected', 'expired', 'cancelled')),
  policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  minutes_delta INTEGER,
  approver_id UUID REFERENCES users(id),
  decided_by UUID REFERENCES users(id),
  decision_comment TEXT,
  decided_at TIMESTAMPTZ,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_correction_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_request_id UUID NOT NULL REFERENCES attendance_correction_requests(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_correction_requests_user_date_status
  ON attendance_correction_requests (user_id, attendance_date, status);

CREATE INDEX idx_attendance_correction_requests_approver_status
  ON attendance_correction_requests (approver_id, status);

CREATE INDEX idx_attendance_correction_audits_request
  ON attendance_correction_audits (correction_request_id, created_at);

CREATE UNIQUE INDEX uq_attendance_correction_pending_per_event
  ON attendance_correction_requests (user_id, attendance_date, event_type)
  WHERE status IN ('submitted', 'pending_approval');
