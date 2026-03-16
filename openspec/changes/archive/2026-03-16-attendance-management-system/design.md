## Context

The organization needs a single web system to manage attendance, leave, overtime, approval, and user administration. Current workflows are fragmented and prone to manual error. The initial scope targets a web-only MVP with fixed schedules, single-level approvals, annual leave plus compensatory leave, and SMTP-based onboarding emails.

The solution stack is fixed by requirements: React frontend, Express backend, PostgreSQL database, and Docker-based deployment including pgAdmin. The system must support two primary roles (`admin`, `employee`) while allowing approval responsibilities to be assigned to designated users and delegated by date range.

## Goals / Non-Goals

**Goals:**
- Provide complete MVP workflows for clock-in/out, leave requests, overtime requests, and approval actions.
- Enforce role-based authorization where admins can manage users and employees can perform self-service actions.
- Send temporary-password onboarding emails when users are created.
- Maintain leave/overtime balances and request statuses with clear auditability.
- Deliver a reproducible local runtime via Docker Compose with React, Express, PostgreSQL, and pgAdmin.

**Non-Goals:**
- Multi-level approval routing in this phase.
- Shift scheduling, roster optimization, or variable shift pattern support.
- Mobile app development.
- Attendance restrictions based on IP/GPS/device identity in MVP.

## Decisions

1. Monorepo service topology
- Decision: Keep frontend and backend as separate services in one repository, coordinated through Docker Compose.
- Rationale: Clear separation of UI and API concerns while preserving simple local orchestration.
- Alternatives considered:
  - Single merged Node service (rejected: weaker boundary between web and API concerns).
  - Multi-repo split (rejected for MVP due to overhead).

2. Authentication and authorization model
- Decision: Use credential-based login with hashed passwords, JWT-based API auth, and middleware-enforced role checks.
- Rationale: Fits Express ecosystem and supports stateless service scaling.
- Alternatives considered:
  - Server-side session store (rejected for additional state management complexity).
  - External identity provider (rejected for MVP scope).

3. User onboarding credential flow
- Decision: Admin-created users receive temporary passwords by SMTP email and must reset password at first login.
- Rationale: Matches confirmed requirement and keeps onboarding deterministic.
- Alternatives considered:
  - Magic-link activation (deferred to future enhancement).

4. Attendance data model
- Decision: Store attendance as explicit event records with day-level derivations in API read models.
- Rationale: Event recording avoids data loss and supports later policy changes.
- Alternatives considered:
  - Precomputed daily summary only (rejected: less flexible and harder to audit).

5. Leave and overtime workflow model
- Decision: Use unified request entities with type-specific fields and a shared status lifecycle (`draft` optional, `submitted`, `approved`, `rejected`, `cancelled`).
- Rationale: Reduces duplication while keeping domain behavior consistent.
- Alternatives considered:
  - Fully separate workflow engines per request type (rejected as over-engineered for MVP).

6. Approval and delegation strategy
- Decision: Implement single-step approval assignment with delegation override during active delegation windows.
- Rationale: Meets requirement for proxy approval without introducing multi-step orchestration.
- Alternatives considered:
  - Hard-coded manager-only approvals (rejected: insufficient flexibility).

7. Database and migration approach
- Decision: PostgreSQL with migration scripts managed by backend migration tooling.
- Rationale: Reliable relational model for transactional workflows and reporting.
- Alternatives considered:
  - ORM auto-sync (rejected to avoid uncontrolled schema drift in production).

8. Runtime and operations stack
- Decision: Provide Docker Compose services for frontend, backend, postgres, pgAdmin, and environment-driven SMTP configuration.
- Rationale: Fast setup, deterministic onboarding, and explicit operations footprint.
- Alternatives considered:
  - Local manual installation without containers (rejected due to reproducibility issues).

## Risks / Trade-offs

- [Temporary password delivered through email could be exposed if mailbox is compromised] -> Mitigation: enforce first-login password reset and short temporary-password expiration.
- [Single-level approval may not satisfy all organizational policies] -> Mitigation: model approval tables to be extensible for future multi-level flow.
- [Fixed schedule attendance cannot represent shift-based teams] -> Mitigation: explicitly scope out shifts and keep attendance schema extensible for future schedule entities.
- [SMTP misconfiguration can block onboarding] -> Mitigation: startup validation for SMTP config plus retry/error logging and admin-visible failure state.
- [Balance inconsistencies from concurrent approvals/cancellations] -> Mitigation: transactional updates and idempotent approval handlers.

## Migration Plan

1. Create baseline PostgreSQL schema for users, roles, attendance, requests, approvals, delegations, and balances.
2. Seed system roles and bootstrap admin account through environment-configured initialization.
3. Deploy API and frontend containers with database and SMTP configuration.
4. Run smoke tests for login, user creation email dispatch, attendance submission, request submission, and approval outcomes.
5. Rollback strategy: revert to previous image tags and run backward-compatible rollback migration scripts where needed.

## Open Questions

- Should overtime approval auto-generate compensatory leave at a fixed conversion ratio or use configurable policy values?
- Should leave balances be granted annually by batch job or manually adjusted by admin in MVP?
- Is there a required retention period for attendance and approval audit logs?
