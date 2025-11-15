import { UserRole } from "../types";
import { ApiRole } from "../types/api";

export const mapApiRolesToUserRole = (roles: ApiRole[] = []): UserRole => {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("instructor")) return "instructor";
  if (roles.includes("student")) return "student";
  return "student";
};

export const mapUserRoleToApiRole = (role: UserRole): ApiRole => {
  if (role === "student") {
    return "student";
  }
  return role;
};
