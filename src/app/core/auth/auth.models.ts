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
  expiresAt: string;
}

export interface InitialChangePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface RefreshResponse {
  expiresAt: string;
}
