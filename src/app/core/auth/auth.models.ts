export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  nickname: string;
  mustChangePassword: boolean;
}

export interface LoginResponse extends AuthenticatedUser {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}
