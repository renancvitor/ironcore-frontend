import { Component, DOCUMENT, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { executionFieldError, validateExecutionNumberInput } from '../../workout-session-execution.form';
import { SessionSetEditor } from '../workout-session-editor-state.service';

@Component({
  selector: 'app-workout-session-set-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, ButtonComponent],
  templateUrl: './workout-session-set-form.component.html',
  styleUrl: './workout-session-set-form.component.scss',
})
export class WorkoutSessionSetFormComponent {
  private readonly document = inject(DOCUMENT);
  readonly row = input.required<SessionSetEditor>();
  readonly activityId = input.required<number>();
  readonly pending = input(false);
  readonly planned = input(false);
  readonly readOnly = input(false);
  readonly blocked = input(false);
  readonly canSave = input(false);
  readonly canDelete = input(false);
  readonly saving = input(false);
  readonly deleting = input(false);
  readonly revision = input(0);
  readonly saved = output<void>();
  readonly deleted = output<void>();
  readonly discarded = output<void>();
  readonly reviewed = output<void>();
  readonly recovered = output<void>();
  readonly fieldError = executionFieldError;
  readonly validateNumber = validateExecutionNumberInput;

  prefix(): string { return `execution-${this.activityId()}-${this.row().key}`; }

  submit(): void {
    const controls = this.row().form.controls;
    validateExecutionNumberInput(this.document.getElementById(`${this.prefix()}-reps`) as HTMLInputElement | null, controls.actualReps);
    validateExecutionNumberInput(this.document.getElementById(`${this.prefix()}-load`) as HTMLInputElement | null, controls.actualLoadKg);
    this.saved.emit();
    const suffix = controls.actualReps.invalid ? 'reps' : controls.actualLoadKg.invalid ? 'load' : null;
    if (suffix) this.document.getElementById(`${this.prefix()}-${suffix}`)?.focus();
  }
}
