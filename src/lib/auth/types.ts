export interface CurrentUser {
  name: string | null;
  email: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
  tenant: {
    id: string;
    name: string;
    document: string | null;
    isActive: boolean;
  } | null;
}
