## 1. Data Model and Policy Foundation

- [ ] 1.1 Create migrations for `attendance_correction_requests`, `attendance_correction_policies`, and `attendance_correction_audits`.
- [ ] 1.2 Seed default policy values and admin-editable configuration endpoint.
- [ ] 1.3 Add indexes for employee/date/status query paths used by dashboards and payroll checks.

## 2. Backend Workflow Implementation

- [ ] 2.1 Implement correction submission API with validations (window, payroll lock, quota, duplicate pending request).
- [ ] 2.2 Implement policy evaluation service for auto-approval vs manual approval routing.
- [ ] 2.3 Integrate existing approval/delegation module for correction decision actions.
- [ ] 2.4 Implement correction cancellation and expiry jobs with audit event recording.

## 3. Attendance Read Model and Payroll Safety

- [ ] 3.1 Extend attendance query API to expose raw vs effective (corrected) timestamps and correction state.
- [ ] 3.2 Add payroll-lock enforcement checks and admin override endpoint with reason logging.
- [ ] 3.3 Add API filter options for `pending-correction`, `corrected`, and `raw` records.

## 4. Frontend Experience

- [ ] 4.1 Build employee missed-punch form with reason, timestamp picker, and optional evidence upload.
- [ ] 4.2 Build approver queue UI for correction review with approve/reject actions and comments.
- [ ] 4.3 Build admin policy management page with safe defaults, validation hints, and change history.
- [ ] 4.4 Show correction status badges and effective timestamps on attendance history screens.

## 5. Observability, Notifications, and Quality

- [ ] 5.1 Add notifications for submission received, decision completed, and request expiry.
- [ ] 5.2 Add audit log export endpoint for HR compliance review.
- [ ] 5.3 Add automated tests for validation rules, approval routing, and payroll lock behavior.
- [ ] 5.4 Add runbook updates for policy tuning guidelines and incident handling.
