import { beforeAll, describe, expect, it } from "vitest";

let createTemporaryPassword: () => string;
let minutesBetween: (a: string, b: string) => number;

beforeAll(async () => {
  process.env.JWT_SECRET = "1234567890abcdef1234567890abcdef";
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/attendance";
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_PORT = "1025";
  process.env.SMTP_FROM = "test@example.com";
  process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
  process.env.INITIAL_ADMIN_PASSWORD = "Admin1234!";

  ({ createTemporaryPassword } = await import("../src/services/auth.js"));
  ({ minutesBetween } = await import("../src/services/time.js"));
});

describe("utility services", () => {
  it("creates a temporary password with expected length", () => {
    const password = createTemporaryPassword();
    expect(password.length).toBe(12);
  });

  it("calculates minutes between timestamps", () => {
    const minutes = minutesBetween("2026-01-01T08:00:00.000Z", "2026-01-01T10:30:00.000Z");
    expect(minutes).toBe(150);
  });
});
