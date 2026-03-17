## MODIFIED Requirements

### Requirement: Employee clock-in and clock-out
The system SHALL allow employees to register one clock-in and one clock-out event per workday for fixed schedule operations, and SHALL support policy-governed correction requests for missed punches.

#### Scenario: Employee clocks in
- **WHEN** an authenticated employee submits a clock-in action for the current workday
- **THEN** the system records a clock-in timestamp for that employee and day

#### Scenario: Employee clocks out
- **WHEN** an authenticated employee with an existing same-day clock-in submits a clock-out action
- **THEN** the system records a clock-out timestamp for that employee and day

#### Scenario: Employee submits missed clock-out correction
- **WHEN** an authenticated employee submits a missed clock-out correction request within the configured submission window
- **THEN** the system stores the request with policy evaluation result and marks attendance as pending correction until finalized

### Requirement: Duplicate attendance action prevention
The system SHALL reject duplicate clock-in or duplicate clock-out actions that violate the daily attendance sequence, and SHALL reject correction requests that violate configured policy limits.

#### Scenario: Duplicate clock-in is rejected
- **WHEN** an employee submits a second clock-in for the same workday
- **THEN** the system rejects the action and preserves the original attendance record

#### Scenario: Clock-out before clock-in is rejected
- **WHEN** an employee submits a clock-out action without a same-day clock-in record
- **THEN** the system rejects the action with a validation error

#### Scenario: Correction request exceeds monthly quota
- **WHEN** an employee submits a correction request after reaching the configured monthly correction quota
- **THEN** the system rejects the request with a policy-limit error

## ADDED Requirements

### Requirement: Configurable missed-punch policy
The system SHALL provide admin-configurable policy controls for missed-punch correction handling, including submission window, monthly quota, auto-approval threshold, evidence rule, and payroll lock period.

#### Scenario: Admin updates correction policy
- **WHEN** an admin updates attendance correction policy settings
- **THEN** the system validates and persists the new settings with audit metadata

#### Scenario: Policy requires evidence for high-risk correction
- **WHEN** a correction request exceeds the configured risk threshold requiring evidence
- **THEN** the system enforces evidence attachment before accepting submission

### Requirement: Policy-based correction approval routing
The system SHALL evaluate each correction request against policy and either auto-approve or route it to the designated approver with delegation support.

#### Scenario: Low-risk request is auto-approved
- **WHEN** a correction request satisfies auto-approval policy conditions
- **THEN** the system marks the request as auto-approved and applies the corrected attendance timestamp

#### Scenario: High-risk request is routed for approval
- **WHEN** a correction request does not satisfy auto-approval conditions
- **THEN** the system routes the request to the active approver (or delegate) and sets status to pending approval

### Requirement: Correction auditability and effective attendance view
The system SHALL preserve immutable correction history and expose effective attendance values alongside raw records.

#### Scenario: Request approved and reflected in effective attendance
- **WHEN** an approver approves a pending correction request
- **THEN** the system records the decision event and returns corrected timestamps as effective values in attendance queries

#### Scenario: Attendance query includes correction state
- **WHEN** an employee or admin retrieves attendance history
- **THEN** the system includes raw timestamps, effective timestamps, and correction status for each day

### Requirement: Payroll lock for retroactive correction
The system SHALL enforce payroll lock rules that block correction requests beyond configured lock days unless explicitly overridden by authorized admin action.

#### Scenario: Retroactive correction blocked by payroll lock
- **WHEN** an employee submits a correction request for a date outside the payroll lock window
- **THEN** the system rejects the request with payroll-lock validation error

#### Scenario: Admin override allows locked correction
- **WHEN** an authorized admin performs an override with a required reason
- **THEN** the system accepts the request and records override metadata in audit logs
