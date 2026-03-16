# Smoke Test Checklist

Date: 2026-03-16
Result: PASS

## Preconditions
- Docker stack started with `docker compose up -d --build`
- Migrations and seed executed in backend container

## Executed flow
1. Logged in with seeded admin account (`admin@example.com`).
2. Admin created employee account (`employee1@example.com`) with admin as approver.
3. Verified onboarding email in MailHog and extracted temporary password.
4. Employee logged in and reset password.
5. Employee clocked in and clocked out.
6. Employee submitted annual leave request.
7. Employee submitted overtime request.
8. Admin opened pending approvals.
9. Admin approved leave and overtime requests.
10. Verified approved statuses and database balance updates.

## Evidence
- `SMOKE_TEST_OK`
- `LEAVE_STATUS=approved`
- `OVERTIME_STATUS=approved`
- DB verification:
  - `annual_minutes=-540`
  - `compensatory_minutes=120`

## Notes
- Local port conflict on `5432` was mitigated by adding configurable `POSTGRES_PORT` in Compose.
