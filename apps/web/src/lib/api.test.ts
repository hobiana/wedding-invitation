import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

const realLocation = window.location;

function stubLocation(pathname: string) {
  const location = { pathname, href: `http://localhost${pathname}` };
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: location });
  return location;
}

function respondWith(status: number, body: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("api request 401 handling", () => {
  beforeEach(() => {
    stubLocation("/admin/households");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: realLocation });
  });

  it("redirects to the login page when an admin call 401s on an expired session", async () => {
    const location = stubLocation("/admin/households");
    respondWith(401, { message: "Unauthorized" });

    await expect(api.get("/admin/households")).rejects.toThrow("Unauthorized");
    expect(location.href).toBe("/login");
  });

  it("still rejects so callers keep seeing the error", async () => {
    respondWith(401, { message: "Unauthorized" });
    await expect(api.patch("/admin/settings", {})).rejects.toThrow("Unauthorized");
  });

  // AuthProvider probes /auth/me on every page load, including for a guest
  // opening their invitation link. Bouncing on that 401 would break the whole
  // public invitation flow.
  it("does not redirect when the session probe /auth/me 401s", async () => {
    const location = stubLocation("/i/abc12345");
    respondWith(401, { message: "Unauthorized" });

    await expect(api.get("/auth/me")).rejects.toThrow();
    expect(location.href).toBe("http://localhost/i/abc12345");
  });

  it("does not redirect when /auth/login 401s on wrong credentials", async () => {
    const location = stubLocation("/login");
    respondWith(401, { message: "Unauthorized" });

    await expect(api.post("/auth/login", { email: "a@b.com", password: "nope" })).rejects.toThrow();
    expect(location.href).toBe("http://localhost/login");
  });

  it("does not bounce a page that is already on /login", async () => {
    const location = stubLocation("/login");
    respondWith(401, { message: "Unauthorized" });

    await expect(api.get("/admin/dashboard")).rejects.toThrow();
    expect(location.href).toBe("http://localhost/login");
  });

  it("leaves non-401 failures alone", async () => {
    const location = stubLocation("/admin/tables");
    respondWith(409, { message: "Table pleine" });

    await expect(api.post("/admin/tables", {})).rejects.toThrow("Table pleine");
    expect(location.href).toBe("http://localhost/admin/tables");
  });
});
