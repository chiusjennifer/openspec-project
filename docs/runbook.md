# Docker Runbook

## 1. Configure environment
- Copy `.env.example` to `.env`.
- Ensure `DATABASE_URL` points to the Compose postgres host (`postgres`).

## 2. Start stack
```bash
docker compose up --build
```

## 3. Run migrations and seed
```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

## 4. Verify services
- API health: `GET http://localhost:4000/health`
- Frontend: `http://localhost:5173`
- MailHog inbox: `http://localhost:8025`

## 5. pgAdmin login
- URL: `http://localhost:5050`
- Email: `${PGADMIN_DEFAULT_EMAIL}`
- Password: `${PGADMIN_DEFAULT_PASSWORD}`

## 6. Add PostgreSQL server in pgAdmin
- Host: `postgres`
- Port: `5432`
- Username: `${POSTGRES_USER}`
- Password: `${POSTGRES_PASSWORD}`
- Database: `${POSTGRES_DB}`

## 7. Rollback (if needed)
```bash
docker compose exec backend npm run rollback
```
