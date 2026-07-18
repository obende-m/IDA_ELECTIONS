export type AdminRole = 'SUPER_ADMIN' | 'ELECTION_COMMITTEE' | 'ADMIN';
export type CreatableAdminRole = 'ADMIN' | 'ELECTION_COMMITTEE';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserValues {
  email: string;
  fullName: string;
  role: CreatableAdminRole;
  password: string;
}
