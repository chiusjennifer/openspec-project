## 1. Project and Runtime Foundation

- [x] 1.1 Create monorepo app structure for React frontend and Express backend services.
- [x] 1.2 Add Dockerfiles for frontend and backend with environment-based configuration support.
- [x] 1.3 Create Docker Compose stack for frontend, backend, PostgreSQL, and pgAdmin services.
- [x] 1.4 Add environment templates and startup validation for required database and SMTP variables.

## 2. Database Schema and Seed Setup

- [x] 2.1 Define PostgreSQL schema and migrations for users, roles, attendance, leave/overtime requests, approvals, delegations, and balance tables.
- [x] 2.2 Implement migration scripts and rollback scripts for schema lifecycle management.
- [x] 2.3 Seed baseline role data and bootstrap initial admin account workflow.

## 3. Authentication and User Provisioning

- [x] 3.1 Implement credential login API with secure password hashing and token issuance.
- [x] 3.2 Implement role-based authorization middleware for API and route-level access controls.
- [x] 3.3 Build admin user management APIs for create, update, and delete operations.
- [x] 3.4 Implement temporary password generation, first-login password reset requirement, and SMTP email dispatch for new users.

## 4. Attendance Management

- [x] 4.1 Implement clock-in and clock-out APIs with daily sequence validation.
- [x] 4.2 Implement attendance query APIs with employee self-view and admin employee-filtered view.
- [x] 4.3 Build frontend attendance pages for clock actions and attendance history display.

## 5. Leave and Overtime Workflow

- [x] 5.1 Implement leave request APIs for annual leave and compensatory leave submission, listing, and cancellation.
- [x] 5.2 Implement overtime request APIs for submission, listing, and cancellation.
- [x] 5.3 Implement shared request status lifecycle handling for submitted, approved, rejected, and cancelled states.
- [x] 5.4 Implement balance adjustment logic triggered by approved leave and overtime outcomes.

## 6. Approval and Delegation

- [x] 6.1 Implement single-level request routing to designated approvers.
- [x] 6.2 Implement approver decision APIs for approve/reject actions with comments and audit metadata.
- [x] 6.3 Implement delegation management APIs for create, update, and revoke with effective date ranges.
- [x] 6.4 Apply delegation override logic so active delegations receive routed approvals.

## 7. Frontend Experience

- [x] 7.1 Build authentication UI including login and first-login password reset flow.
- [x] 7.2 Build admin UI for user management and provisioning status feedback.
- [x] 7.3 Build employee UI for leave/overtime submission and request status tracking.
- [x] 7.4 Build approver UI for approval inbox, decision actions, and delegation settings.

## 8. Quality and Readiness

- [x] 8.1 Add automated tests for auth, user provisioning, attendance sequencing, request lifecycle, and delegation routing.
- [x] 8.2 Add integration tests covering API + database behavior for approval and balance updates.
- [x] 8.3 Add Docker-based local runbook documenting startup, pgAdmin login, migrations, and smoke-test flows.
- [x] 8.4 Execute end-to-end smoke test of onboarding email, clock-in/out, leave/overtime submission, and approval completion.

