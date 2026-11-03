import { FormControl } from '@angular/forms';
import { passwordByteLimit } from './password.validator';

describe('passwordByteLimit', () => {
  it.each(['a'.repeat(72), 'é'.repeat(36), '😀'.repeat(18)])('accepts 72 UTF-8 bytes', (value) => {
    expect(passwordByteLimit(new FormControl(value))).toBeNull();
  });
  it.each(['a'.repeat(73), 'é'.repeat(37), '😀'.repeat(19)])(
    'rejects excess bytes without truncating',
    (value) => {
      const control = new FormControl(value);
      expect(passwordByteLimit(control)).toEqual({ passwordByteLimit: true });
      expect(control.value).toBe(value);
    },
  );
});
