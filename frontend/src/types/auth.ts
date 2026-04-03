export type AppUserRole = "admin" | "reader";

export type AppUser = {
  id: number;
  clerkUserId: string;
  email: string;
  role: AppUserRole;
  createdAt: string;
  updatedAt: string;
};
