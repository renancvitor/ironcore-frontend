import { Component, effect, forwardRef, input, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';

class IronCoreErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly hasError: () => boolean) {}

  isErrorState(): boolean {
    return this.hasError();
  }
}
@Component({
  selector: 'app-input',
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  id = input.required<string>();
  label = input.required<string>();
  placeholder = input<string>('');
  type = input<'text' | 'email' | 'password' | 'number'>('text');
  disabled = input<boolean>(false);
  error = input<string>('');

  value = '';
  formDisabled = false;

  readonly errorStateMatcher = new IronCoreErrorStateMatcher(() => !!this.error());

  private readonly matInput = viewChild(MatInput);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      this.error();
      this.matInput()?.updateErrorState();
    });
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled = isDisabled;
  }

  handleInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;

    this.value = inputElement.value;
    this.onChange(this.value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
