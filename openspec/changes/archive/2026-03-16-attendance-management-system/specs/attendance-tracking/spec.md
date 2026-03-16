## ADDED Requirements

### Requirement: Employee clock-in and clock-out
The system SHALL allow employees to register one clock-in and one clock-out event per workday for fixed schedule operations.

#### Scenario: Employee clocks in
- **WHEN** an authenticated employee submits a clock-in action for the current workday
- **THEN** the system records a clock-in timestamp for that employee and day

#### Scenario: Employee clocks out
- **WHEN** an authenticated employee with an existing same-day clock-in submits a clock-out action
- **THEN** the system records a clock-out timestamp for that employee and day

### Requirement: Duplicate attendance action prevention
The system SHALL reject duplicate clock-in or duplicate clock-out actions that violate the daily attendance sequence.

#### Scenario: Duplicate clock-in is rejected
- **WHEN** an employee submits a second clock-in for the same workday
- **THEN** the system rejects the action and preserves the original attendance record

#### Scenario: Clock-out before clock-in is rejected
- **WHEN** an employee submits a clock-out action without a same-day clock-in record
- **THEN** the system rejects the action with a validation error

### Requirement: Attendance history retrieval
The system SHALL provide employees and admins with attendance history queries based on date range filters.

#### Scenario: Employee views personal history
- **WHEN** an employee requests attendance history for a date range
- **THEN** the system returns only that employee's attendance records for the selected period

#### Scenario: Admin views employee history
- **WHEN** an admin requests attendance history for a selected employee and date range
- **THEN** the system returns matching attendance records for the selected employee
