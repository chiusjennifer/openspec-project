export type RoleName = "admin" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  roleName: RoleName;
  mustResetPassword: boolean;
}

export type RequestStatus = "submitted" | "approved" | "rejected" | "cancelled";
export type LeaveType = "annual" | "compensatory";
