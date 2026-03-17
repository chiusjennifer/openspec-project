## Why

Current attendance rules are strict (`one clock-in + one clock-out per day`) and create avoidable friction when employees forget to punch. HR and approvers currently need ad-hoc handling, which leads to inconsistent decisions, slow payroll cutoff, and weak audit trails.

A flexible missed-punch policy is needed so the organization can balance operational control and employee fairness through configurable rules.

## What Changes

- Add a missed-punch correction workflow for employees to submit retroactive attendance fixes.
- Introduce configurable policy rules (deadline window, monthly quota, required evidence, and approval route) so each organization can tune strictness.
- Support policy-driven auto-approval for low-risk corrections and manual approval for higher-risk cases.
- Record full correction audit history (who submitted, who approved/rejected, original value, corrected value, reason, timestamps).
- Add manager/admin dashboards for correction queue, policy configuration, and exception monitoring.

## Capabilities

### New Capabilities
- `attendance-exception-management`: Missed-punch correction submission, policy evaluation, approval, and audit trail.

### Modified Capabilities
- `attendance-tracking`: Extend attendance lifecycle to include correction requests and finalized corrected timestamps.
- `approval-and-delegation`: Reuse existing delegation logic for correction approvals.

## Impact

- New backend APIs for correction submission, policy retrieval/update, approval decisions, and history queries.
- New database entities for correction requests, correction policy, and correction audit events.
- Frontend additions for employee correction form, approver queue, and admin policy page.
- Additional tests for policy rule evaluation, auto/manual approval routing, and payroll cutoff behavior.
- Documentation update for attendance operations and policy governance.
