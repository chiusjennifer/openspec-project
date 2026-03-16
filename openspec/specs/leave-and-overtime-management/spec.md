## Purpose

Defines requirements for the leave-and-overtime-management capability.

## ADDED Requirements

### Requirement: Leave request submission
The system SHALL allow employees to submit leave requests for annual leave and compensatory leave.

#### Scenario: Employee submits annual leave request
- **WHEN** an employee submits a leave request with type annual leave and valid date range
- **THEN** the system stores the request with submitted status and routes it for approval

#### Scenario: Employee submits compensatory leave request
- **WHEN** an employee submits a leave request with type compensatory leave and valid date range
- **THEN** the system stores the request with submitted status and routes it for approval

### Requirement: Overtime request submission
The system SHALL allow employees to submit overtime requests with date, time range, and reason.

#### Scenario: Employee submits overtime request
- **WHEN** an employee submits overtime details with valid start and end times
- **THEN** the system stores the request with submitted status and routes it for approval

### Requirement: Request status tracking
The system SHALL track leave and overtime request states through submitted, approved, rejected, and cancelled states.

#### Scenario: Employee reviews request status
- **WHEN** an employee opens request history
- **THEN** the system displays current status and latest decision timestamp for each request

#### Scenario: Employee cancels pending request
- **WHEN** an employee cancels a submitted request that has not been approved or rejected
- **THEN** the system updates the request status to cancelled

### Requirement: Balance update on approval
The system SHALL update annual leave and compensatory leave balances only when related requests are approved.

#### Scenario: Approved annual leave consumes balance
- **WHEN** an annual leave request is approved
- **THEN** the system deducts approved leave duration from the employee annual leave balance

#### Scenario: Approved overtime increases compensatory leave balance
- **WHEN** an overtime request is approved according to compensatory policy
- **THEN** the system increases the employee compensatory leave balance by the approved conversion amount

