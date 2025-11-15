import { ApiUser } from "../types/api";
import { User } from "../types";
import { mapApiRolesToUserRole } from "./role";

export const mapApiUserToUser = (apiUser: ApiUser): User => {
  const nameParts = apiUser.name?.trim().split(/\s+/) || [];
  const firstName = nameParts[0] || apiUser.email.split("@")[0];
  const lastName = nameParts.slice(1).join(" ");

  return {
    id: String(apiUser.id),
    firstName,
    lastName,
    email: apiUser.email,
    dateOfBirth: "",
    role: mapApiRolesToUserRole(apiUser.roles),
    totalPoints: 0,
    createdAt: apiUser.created_at,
  };
};

export const composeName = (firstName: string, lastName: string) =>
  `${firstName} ${lastName}`.trim();
