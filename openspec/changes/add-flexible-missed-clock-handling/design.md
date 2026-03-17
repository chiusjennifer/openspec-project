## Context

The existing attendance capability only supports same-day direct punch actions and rejects invalid sequences. In practice, employees may miss punch-in or punch-out due to meetings, network issues, or device interruptions. Without a standardized correction flow, teams rely on manual exceptions that are inconsistent and difficult to audit.

The system already has approval and delegation capabilities, so missed-punch handling should leverage this foundation while introducing policy flexibility. The goal is to support different company control levels without code changes.

## Goals / Non-Goals

**Goals:**
- Enable employees to submit missed-punch correction requests with reason and optional evidence.
- Make correction governance configurable by policy (deadline, monthly quota, proof requirement, approval mode).
- Apply policy-based routing: auto-approve low-risk cases, route higher-risk cases to approvers.
- Preserve immutable audit records linking raw punch events and corrected outcomes.
- Ensure payroll-facing attendance queries can distinguish `raw`, `pending-correction`, and `corrected` states.

**Non-Goals:**
- Replacing shift scheduling logic or introducing advanced roster planning.
- Editing or deleting raw attendance events.
- Multi-level correction approvals in this phase.
- AI-based fraud detection (future enhancement).

## Decisions

1. Correction request as first-class entity
- Decision: Store each missed-punch fix as a standalone `attendance_correction_request` record referencing attendance day and event type (`clock_in` or `clock_out`).
- Rationale: Keeps correction lifecycle explicit and auditable.
- Alternatives considered:
  - Directly overwrite attendance row (rejected: weak traceability).

2. Policy-driven rule engine
- Decision: Add organization-level policy with configurable fields:
  - `submission_window_days`
  - `monthly_quota_per_employee`
  - `requires_evidence_after_hours`
  - `auto_approve_max_minutes_delta`
  - `payroll_lock_days`
- Rationale: Provides flexibility without frequent deployments.
- Alternatives considered:
  - Hardcoded limits (rejected: cannot adapt across teams).

3. Hybrid approval model
- Decision: Use automatic approval when correction delta is below policy threshold and quota is available; otherwise route to designated approver with delegation override.
- Rationale: Balances operational speed and control.
- Alternatives considered:
  - All manual approval (rejected: heavy operational load).
  - All auto-approval (rejected: weak risk control).

4. Correction state model
- Decision: Correction statuses = `submitted`, `auto_approved`, `pending_approval`, `approved`, `rejected`, `expired`, `cancelled`.
- Rationale: Supports SLA tracking and audit clarity.
- Alternatives considered:
  - Minimal `pending/approved/rejected` only (rejected: insufficient operational signals).

5. Payroll cutoff protection
- Decision: Disallow new corrections when attendance date is beyond `payroll_lock_days` unless admin override is explicitly enabled.
- Rationale: Prevents silent retroactive payroll drift.
- Alternatives considered:
  - Allow unlimited backdating (rejected: payroll reconciliation risk).

## Risks / Trade-offs

- [Auto-approval threshold too loose may permit abuse] -> Mitigation: start conservative default and monitor monthly exception rates.
- [Policy too strict may increase rejection volume and user frustration] -> Mitigation: expose analytics for policy tuning.
- [Late corrections can conflict with payroll close] -> Mitigation: enforce payroll lock and explicit override audit.
- [Evidence attachment storage can grow quickly] -> Mitigation: retention policy and object-storage lifecycle rules.
- [Cross-timezone teams may dispute attendance date boundaries] -> Mitigation: evaluate correction window using employee timezone profile.

## Migration Plan

1. Add tables for correction requests, policy config, and correction audit events.
2. Seed default policy values for existing tenant/org.
3. Extend attendance read model to surface correction state and effective timestamps.
4. Release employee and approver UI paths behind feature flag.
5. Run backfill check to mark historical records as `raw` with no correction state.
6. Enable feature for pilot department, monitor 2 payroll cycles, then roll out broadly.

## Open Questions

- Should monthly quota be counted by submit date or attendance date?
- Does HR require different policy profiles per department or one organization-wide policy initially?
- Is evidence mandatory for weekends/holidays regardless of correction delta?
- What is the target SLA for approver decisions before auto-expiry?
