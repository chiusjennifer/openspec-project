## Why

The team needs a unified attendance and workforce workflow system so employees can clock in/out, request leave, and submit overtime without relying on fragmented manual processes. Building this now establishes a clear approval and balance-tracking foundation for compliant daily operations.

## What Changes

- Build a web-based attendance management system with React frontend, Express backend, and PostgreSQL persistence.
- Introduce role-based access with `admin` and `employee` permissions; `admin` can create, edit, and delete user accounts.
- Send an onboarding email with a temporary password when an admin creates a new user account.
- Support employee clock-in and clock-out records for fixed schedule operations.
- Support leave requests (annual leave and compensatory leave) and overtime requests.
- Add single-level approval workflow for leave and overtime requests.
- Add delegation support so an approver can designate an acting approver during a date range.
- Update balances when approved requests are finalized (annual leave and compensatory leave).
- Provide Docker-based local environment including PostgreSQL and pgAdmin web UI.

## Capabilities

### New Capabilities
- `user-access-provisioning`: Role-based authentication/authorization, admin user lifecycle management, and new-user email credential delivery.
- `attendance-tracking`: Employee clock-in/clock-out recording and retrieval for daily attendance.
- `leave-and-overtime-management`: Leave/overtime request creation, status tracking, and balance adjustments for annual leave and compensatory leave.
- `approval-and-delegation`: Single-level approval routing with delegation (proxy approver) during configured periods.
- `containerized-runtime-stack`: Docker Compose runtime with React app, Express API, PostgreSQL, and pgAdmin for environment bootstrap.

### Modified Capabilities
- None.

## Impact

- New React UI pages for login, attendance actions, request forms, and admin user management.
- New Express APIs for auth, users, attendance, leave/overtime requests, approvals, and delegations.
- New PostgreSQL schema and migration set for users, attendance, request workflows, approvals, and balances.
- New email integration for credential delivery through SMTP configuration.
- New Docker Compose and service configuration for app containers, PostgreSQL, and pgAdmin.
