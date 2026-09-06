export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  type: ToastType;
  message: string;
}
