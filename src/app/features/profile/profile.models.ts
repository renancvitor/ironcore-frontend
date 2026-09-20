export interface ChangeNicknameRequest {
  nickname: string;
}

export interface ChangeNicknameResponse {
  nickname: string;
}

export type SexType = 'MALE' | 'FEMALE';

export interface Person {
  personId: number;
  name: string;
  sex: SexType;
  birthDate: string;
}

export interface UpdatePersonRequest {
  name?: string;
  sex?: SexType;
  birthDate?: string;
}

export interface UpdatePersonResponse {
  name: string;
  sex: SexType;
  birthDate: string;
}

export type EditableField = 'nickname' | 'name' | 'sex' | 'birthDate';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
