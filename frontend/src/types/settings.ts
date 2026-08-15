export type UserRole = 'ADMIN' | 'BRANCH_ADMIN';

export interface Branch {
  id: string;
  name: string;
  location: string;
  phone_no?: string;
  phone_no_second?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  branches: string[]; // Branch IDs
  branch_details: { id: string; name: string }[];
  first_name: string;
  last_name: string;
}


