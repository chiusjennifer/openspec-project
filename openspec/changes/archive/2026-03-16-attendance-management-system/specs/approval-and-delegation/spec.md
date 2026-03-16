## ADDED Requirements

### Requirement: Single-level approval routing
The system SHALL route submitted leave and overtime requests to a single designated approver.

#### Scenario: Request routed to approver
- **WHEN** an employee submits a leave or overtime request
- **THEN** the system assigns exactly one active approver and marks the request pending approval

### Requirement: Approver decision actions
The system SHALL allow the assigned approver to approve or reject a pending request with an optional comment.

#### Scenario: Approver approves request
- **WHEN** the assigned approver chooses approve on a pending request
- **THEN** the system updates request status to approved and records the approver decision metadata

#### Scenario: Approver rejects request
- **WHEN** the assigned approver chooses reject on a pending request
- **THEN** the system updates request status to rejected and records the rejection reason or comment

### Requirement: Delegation-based proxy approval
The system SHALL support approver delegation windows so requests are routed to the delegate while delegation is active.

#### Scenario: Active delegation re-routes approval
- **WHEN** a request is submitted during an approver's active delegation period
- **THEN** the system routes the request to the delegated approver

#### Scenario: Delegation expiry restores primary approver
- **WHEN** a request is submitted outside an active delegation period
- **THEN** the system routes the request to the original designated approver

### Requirement: Delegation administration controls
The system SHALL allow authorized users to create, update, and revoke delegation entries with start and end dates.

#### Scenario: Approver creates delegation period
- **WHEN** an authorized approver configures a delegate and effective date range
- **THEN** the system stores the delegation as active for that period

#### Scenario: Delegation is revoked before end date
- **WHEN** an authorized approver revokes an active delegation
- **THEN** the system stops using that delegation for newly submitted requests
