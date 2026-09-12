export interface AuthenticatedUser {
  id: number;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SessionState {
  authenticated: boolean;
  user: AuthenticatedUser | null;
}
