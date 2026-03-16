import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../src/api";

describe("api configuration", () => {
  it("has default API base url", () => {
    expect(API_BASE_URL).toBeTruthy();
  });
});
