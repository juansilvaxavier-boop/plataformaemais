import { describe, expect, it } from "vitest";
import { hasRole, canManageContent, canAccessAdmin, canAccessManagerDashboard, assertRole, ForbiddenError } from "./rbac";

describe("hasRole", () => {
  it("allows a role to access its own minimum level", () => {
    expect(hasRole("MANAGER", "MANAGER")).toBe(true);
  });

  it("allows higher roles to access lower minimums", () => {
    expect(hasRole("ADMIN", "EMPLOYEE")).toBe(true);
    expect(hasRole("ADMIN", "INSTRUCTOR")).toBe(true);
    expect(hasRole("ADMIN", "MANAGER")).toBe(true);
  });

  it("denies lower roles from accessing higher minimums", () => {
    expect(hasRole("EMPLOYEE", "MANAGER")).toBe(false);
    expect(hasRole("INSTRUCTOR", "ADMIN")).toBe(false);
  });

  it("denies when role is undefined", () => {
    expect(hasRole(undefined, "EMPLOYEE")).toBe(false);
  });
});

describe("role helpers", () => {
  it("canManageContent requires at least INSTRUCTOR", () => {
    expect(canManageContent("INSTRUCTOR")).toBe(true);
    expect(canManageContent("EMPLOYEE")).toBe(false);
  });

  it("canAccessAdmin requires ADMIN", () => {
    expect(canAccessAdmin("ADMIN")).toBe(true);
    expect(canAccessAdmin("MANAGER")).toBe(false);
  });

  it("canAccessManagerDashboard requires at least MANAGER", () => {
    expect(canAccessManagerDashboard("MANAGER")).toBe(true);
    expect(canAccessManagerDashboard("ADMIN")).toBe(true);
    expect(canAccessManagerDashboard("INSTRUCTOR")).toBe(false);
  });
});

describe("assertRole", () => {
  it("does not throw when the role qualifies", () => {
    expect(() => assertRole("ADMIN", "MANAGER")).not.toThrow();
  });

  it("throws ForbiddenError when the role does not qualify", () => {
    expect(() => assertRole("EMPLOYEE", "ADMIN")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when role is undefined", () => {
    expect(() => assertRole(undefined, "EMPLOYEE")).toThrow(ForbiddenError);
  });
});
