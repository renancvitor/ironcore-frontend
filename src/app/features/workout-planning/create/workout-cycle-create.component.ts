import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutCycleFormComponent, WorkoutCycleSaved } from '../form/workout-cycle-form.component';

@Component({
  selector: 'app-workout-cycle-create',
  imports: [WorkoutCycleFormComponent],
  template: `<section>
    <header>
      <h1>Novo ciclo de treino</h1>
      <p>Defina o objetivo e as informações do seu ciclo de treino.</p>
    </header>
    <app-workout-cycle-form (saved)="onSaved($event)" (cancelled)="cancel()" />
  </section>`,
  styles: `
    section {
      display: grid;
      gap: var(--ic-space-5);
      min-width: 0;
    }
    h1 {
      margin: 0;
    }
    p {
      color: var(--ic-text-secondary);
    }
  `,
})
export class WorkoutCycleCreateComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  onSaved(event: WorkoutCycleSaved): void {
    void this.router.navigate(['/workout-planning', event.response.id]).then((navigated) => {
      if (navigated) this.toast.success('Ciclo de treino criado com sucesso.');
    });
  }

  cancel(): void {
    void this.router.navigate(['/workout-planning']);
  }
}
