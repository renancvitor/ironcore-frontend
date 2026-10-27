import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, DOCUMENT, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, finalize, fromEvent, Subject, take, takeUntil } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WEEK_DAY_LABELS } from '../../workout-planning/workout-planning.labels';
import {
  WORKOUT_SESSION_CLOSE_REASON_LABELS,
  WORKOUT_SESSION_STATUS_LABELS,
} from '../workout-sessions.labels';
import { GetWorkoutSessionDetailResponse } from '../workout-sessions.models';
import { WorkoutSessionsService } from '../workout-sessions.service';

@Component({
  selector: 'app-workout-session-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ButtonComponent,
    EmptyStateComponent,
    LoadingComponent,
  ],
  templateUrl: './workout-session-detail.component.html',
  styleUrl: './workout-session-detail.component.scss',
})
export class WorkoutSessionDetailComponent implements OnInit {
  private readonly service = inject(WorkoutSessionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly contextChanged = new Subject<void>();
  private sessionId: number | null = null;
  private validRoute = true;

  readonly session = signal<GetWorkoutSessionDetailResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly empty = signal(false);
  readonly notFound = signal(false);
  readonly closeState = signal<'confirming' | 'saving' | null>(null);
  readonly busy = computed(() => this.loading() || this.closeState() !== null);
  readonly canClose = computed(
    () => this.session()?.status === 'IN_PROGRESS' && !this.busy() && !this.error(),
  );
  readonly statusLabels = WORKOUT_SESSION_STATUS_LABELS;
  readonly closeReasonLabels = WORKOUT_SESSION_CLOSE_REASON_LABELS;
  readonly weekDayLabels = WEEK_DAY_LABELS;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.contextChanged.next();
      this.session.set(null);
      this.closeState.set(null);
      this.loading.set(false);
      this.error.set('');
      this.empty.set(false);
      this.notFound.set(false);
      const rawId = params.get('id');
      this.sessionId = rawId === null ? null : Number(rawId);
      this.validRoute =
        rawId === null || (Number.isSafeInteger(this.sessionId) && this.sessionId! > 0);
      if (this.validRoute) this.loadSession();
      else this.notFound.set(true);
    });
    fromEvent(this.document, 'visibilitychange')
      .pipe(
        filter(() => this.document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.session()?.status !== 'CLOSED') this.loadSession();
      });
  }

  loadSession(): void {
    if (this.busy() || !this.validRoute) return;
    this.loading.set(true);
    this.error.set('');
    this.empty.set(false);
    this.notFound.set(false);
    const id = this.sessionId;
    const request =
      id === null
        ? this.service.getInProgressWorkoutSession()
        : this.service.getWorkoutSessionDetail(id);
    request
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (session) => {
          if (id === null && session) {
            void this.router.navigate(['/workout-sessions', session.id], { replaceUrl: true });
            return;
          }
          this.session.set(session);
          this.empty.set(session === null);
        },
        error: (error) => {
          if (error.status === 401) return;
          if (id !== null && error.status === 404) {
            this.session.set(null);
            this.notFound.set(true);
            return;
          }
          this.error.set(error.error?.message ?? 'Não foi possível carregar a sessão de treino.');
        },
      });
  }

  closeSession(): void {
    if (!this.canClose()) return;
    const session = this.session()!;
    this.closeState.set('confirming');
    this.dialogService
      .open({
        title: 'Encerrar sessão de treino',
        message: `Deseja encerrar a sessão de “${session.workoutDayTitleSnapshot}”? O encerramento não confirma a execução dos exercícios planejados.`,
        primaryAction: 'Encerrar sessão',
        secondaryAction: 'Voltar',
      })
      .pipe(take(1), takeUntil(this.contextChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        this.closeState.set(null);
        if (!confirmed || !this.canClose()) return;
        this.closeConfirmedSession(session.id);
      });
  }

  private closeConfirmedSession(id: number): void {
    this.closeState.set('saving');
    this.service
      .closeWorkoutSession(id)
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.closeState.set(null)),
      )
      .subscribe({
        next: (response) => {
          this.session.update((current) => (current ? { ...current, ...response } : null));
          if (response.closeReason === 'AUTO_EXPIRED') {
            this.toastService.info('A sessão foi encerrada automaticamente por expiração.');
          } else {
            this.toastService.success('Sessão de treino encerrada com sucesso.');
          }
        },
        error: (error) => {
          if (error.status === 401) return;
          this.dialogService.open({
            title: 'Não foi possível encerrar a sessão de treino',
            message:
              error.error?.message ??
              'Não foi possível confirmar o encerramento. Consulte o estado atualizado antes de tentar novamente.',
            primaryAction: 'Ok',
          });
          this.closeState.set(null);
          this.loadSession();
        },
      });
  }

  backToPlanning(): void {
    if (!this.busy()) void this.router.navigate(['/workout-planning']);
  }

  openSourceCycle(): void {
    const id = this.session()?.workoutCycleId;
    if (!this.busy() && id !== null && id !== undefined) {
      void this.router.navigate(['/workout-planning', id]);
    }
  }
}
