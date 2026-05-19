export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES';

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
  branch: string | null; // This is the Branch ID
  first_name: string;
  last_name: string;
}


