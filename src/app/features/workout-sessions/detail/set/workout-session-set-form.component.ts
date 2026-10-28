import { DecimalPipe } from '@angular/common';
import { Component, DOCUMENT, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { executionFieldError, executionNotes, validateExecutionNumberInput } from '../../workout-session-execution.form';
import { SessionSetEditor } from '../workout-session-editor-state.service';

@Component({
  selector: 'app-workout-session-set-form',
  imports: [DecimalPipe, MatButtonModule, MatIconModule, MatTooltipModule,
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, ButtonComponent],
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
  readonly saved = output<() => void>();
  readonly deleted = output<void>();
  readonly discarded = output<() => void>();
  readonly reviewed = output<void>();
  readonly recovered = output<void>();
  readonly fieldError = executionFieldError;
  readonly validateNumber = validateExecutionNumberInput;
  readonly editing = signal(false);
  notesOpen = false;

  needsAttention(): boolean {
    return this.pending() || this.row().form.invalid || !!this.row().error || this.row().conflict || !!this.row().uncertain;
  }

  notesAttention(): boolean {
    return this.row().form.controls.notes.invalid || this.row().conflict ||
      executionNotes(this.row().form.controls.notes.value) !== this.row().baseline.notes;
  }

  toggleNotes(event: Event): void {
    const details = event.target as HTMLDetailsElement;
    if (this.notesAttention()) details.open = true;
    this.notesOpen = details.open;
  }

  expanded(): boolean { return this.editing() || this.needsAttention(); }

  startEdit(): void {
    this.editing.set(true);
    setTimeout(() => this.document.getElementById(`${this.prefix()}-reps`)?.focus());
  }

  cancel(): void {
    if (this.needsAttention() || !this.row().persisted) {
      this.discarded.emit(() => this.closeEditor());
    } else this.closeEditor();
  }

  private closeEditor(): void {
    const restoreFocus = this.document.activeElement?.closest('form')?.getAttribute('aria-labelledby') === `${this.prefix()}-title`;
    this.editing.set(false);
    this.notesOpen = false;
    if (restoreFocus) setTimeout(() => this.document.getElementById(`${this.prefix()}-edit`)?.focus({ preventScroll: true }));
  }

  prefix(): string { return `execution-${this.activityId()}-${this.row().key}`; }

  submit(): void {
    const controls = this.row().form.controls;
    validateExecutionNumberInput(this.document.getElementById(`${this.prefix()}-reps`) as HTMLInputElement | null, controls.actualReps);
    validateExecutionNumberInput(this.document.getElementById(`${this.prefix()}-load`) as HTMLInputElement | null, controls.actualLoadKg);
    if (this.row().persisted && !this.needsAttention()) {
      this.closeEditor();
      return;
    }
    // Collapse only after the existing persistence flow confirms the write.
    this.saved.emit(() => this.closeEditor());
    const suffix = controls.actualReps.invalid ? 'reps' : controls.actualLoadKg.invalid ? 'load' : null;
    if (suffix) this.document.getElementById(`${this.prefix()}-${suffix}`)?.focus();
  }
}
