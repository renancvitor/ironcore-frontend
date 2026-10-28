import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, DOCUMENT, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  catchError,
  defaultIfEmpty,
  defer,
  filter,
  finalize,
  fromEvent,
  map,
  Observable,
  of,
  Subject,
  take,
  takeUntil,
} from 'rxjs';
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
import { WorkoutSessionsService } from '../workout-sessions.service';
import { WorkoutSessionEditorState } from './workout-session-editor-state.service';
import { WorkoutSessionNavigation } from './workout-session-pending-changes.guard';
import { WorkoutSessionActivityComponent } from './activity/workout-session-activity.component';
import { executionFieldError } from '../workout-session-execution.form';
import { progressNavigationQuery } from '../progress/workout-session-progress.utils';

@Component({
  selector: 'app-workout-session-detail',
  providers: [WorkoutSessionEditorState],
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    WorkoutSessionActivityComponent,
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
  private readonly navigation = inject(WorkoutSessionNavigation);
  readonly editor = inject(WorkoutSessionEditorState);
  private readonly contextChanged = new Subject<void>();
  private sessionId: number | null = null;
  private validRoute = true;
  private initialized = false;
  private acceptedRawId: string | null = null;
  private contextRequest = 0;
  readonly navigationConfirming = signal(false);

  readonly session = this.editor.session;
  readonly loading = signal(false);
  readonly error = this.editor.loadError;
  readonly empty = signal(false);
  readonly notFound = this.editor.notFound;
  readonly closeState = signal<'confirming' | 'saving' | null>(null);
  readonly editingBlocked = computed(
    () =>
      this.loading() ||
      this.closeState() !== null ||
      this.navigationConfirming() ||
      this.navigation.pending() ||
      this.editor.confirming(),
  );
  readonly busy = computed(() => this.editingBlocked() || this.editor.busy());
  readonly canClose = computed(
    () =>
      this.session()?.status === 'IN_PROGRESS' &&
      !this.busy() &&
      !this.error() &&
      !this.editor.needsRefresh() &&
      !this.editor.hasUncertainCreation(),
  );
  readonly statusLabels = WORKOUT_SESSION_STATUS_LABELS;
  readonly closeReasonLabels = WORKOUT_SESSION_CLOSE_REASON_LABELS;
  readonly weekDayLabels = WEEK_DAY_LABELS;
  readonly fieldError = executionFieldError;

  ngOnInit(): void {
    this.editor.isBlocked = () => this.editingBlocked();
    this.navigation.register(this, () => this.confirmLeave());
    this.destroyRef.onDestroy(() => this.navigation.unregister(this));
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rawId = params.get('id');
      if (this.initialized && rawId === this.acceptedRawId) return;
      const request = ++this.contextRequest;
      if (!this.initialized || this.navigation.approvedFor(rawId)) this.acceptContext(rawId);
      else
        this.confirmLeave()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((accepted) => {
            if (request !== this.contextRequest) return;
            if (accepted) this.acceptContext(rawId);
            else this.restoreContextUrl();
          });
    });
    fromEvent(this.document, 'visibilitychange')
      .pipe(
        filter(() => this.document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.session()?.status !== 'CLOSED') this.loadSession();
      });
    fromEvent<BeforeUnloadEvent>(this.document.defaultView!, 'beforeunload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (this.editor.hasPending() || this.editor.busy() || this.closeState() !== null) {
          event.preventDefault();
          event.returnValue = '';
        }
      });
  }

  private acceptContext(rawId: string | null): void {
    this.contextChanged.next();
    this.editor.reset();
    this.initialized = true;
    this.acceptedRawId = rawId;
    this.closeState.set(null);
    this.loading.set(false);
    this.error.set('');
    this.empty.set(false);
    this.notFound.set(false);
    this.sessionId = rawId === null ? null : Number(rawId);
    this.validRoute =
      rawId === null || (Number.isSafeInteger(this.sessionId) && this.sessionId! > 0);
    if (this.validRoute) this.loadSession(true);
    else this.notFound.set(true);
  }

  private restoreContextUrl(): void {
    const url =
      this.acceptedRawId === null ? '/workout-sessions' : `/workout-sessions/${this.acceptedRawId}`;
    if (this.router.url !== url)
      void this.router.navigateByUrl(url, { replaceUrl: true }).catch(() => {
        this.error.set(
          'Não foi possível restaurar a navegação. Seus rascunhos permanecem nesta página.',
        );
      });
  }

  confirmLeave(): Observable<boolean> {
    if (this.editor.busy() || this.closeState() !== null || this.navigationConfirming())
      return of(false);
    if (!this.editor.hasPending()) return of(true);
    this.navigationConfirming.set(true);
    return defer(() =>
      this.dialogService.open({
        title: 'Sair com alterações não salvas',
        message:
          'Há rascunhos não salvos. Sair descartará as alterações locais; não desfaz gravações já enviadas ao servidor.',
        primaryAction: 'Sair sem salvar',
        secondaryAction: 'Continuar preenchendo',
      }),
    ).pipe(
      take(1),
      defaultIfEmpty(false),
      map((accepted) => {
        this.navigationConfirming.set(false);
        return accepted === true;
      }),
      catchError(() => of(false)),
      finalize(() => this.navigationConfirming.set(false)),
      takeUntilDestroyed(this.destroyRef),
    );
  }

  loadSession(acceptingContext = false): void {
    if ((!acceptingContext && this.busy()) || !this.validRoute) return;
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
          if (session) this.editor.reconcile(session);
          else this.session.set(null);
          this.empty.set(session === null);
        },
        error: (error) => {
          if (error.status === 401) return;
          if (id !== null && error.status === 404) {
            if (!this.editor.hasPending()) this.session.set(null);
            this.editor.needsRefresh.set(true);
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
    const pending = this.editor.hasPending();
    this.closeState.set('confirming');
    defer(() =>
      this.dialogService.open({
        title: 'Encerrar sessão de treino',
        message: `Deseja encerrar a sessão de “${session.workoutDayTitleSnapshot}”? O encerramento não confirma a execução dos exercícios planejados.${pending ? ' Há alterações não salvas. Volte para salvá-las individualmente ou encerre descartando esses rascunhos.' : ''}`,
        primaryAction: pending ? 'Encerrar sem salvar alterações' : 'Encerrar sessão',
        secondaryAction: 'Voltar',
      }),
    )
      .pipe(
        take(1),
        defaultIfEmpty(false),
        catchError(() => of(false)),
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
      )
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
          this.editor.discardAll();
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

  returnToList(): void {
    if (this.busy()) return;
    if (this.route.snapshot.queryParamMap.get('from') === 'progress') {
      void this.router.navigate(['/workout-sessions/progress'], {
        queryParams: progressNavigationQuery(this.route.snapshot.queryParamMap),
      });
      return;
    }
    if (
      this.route.snapshot.queryParamMap.get('from') === 'history' ||
      this.session()?.status === 'CLOSED'
    ) {
      const queryParams = progressNavigationQuery(this.route.snapshot.queryParamMap);
      if (Object.keys(queryParams).length) {
        void this.router.navigate(['/workout-sessions/history'], { queryParams });
      } else void this.router.navigate(['/workout-sessions/history']);
    } else this.backToPlanning();
  }

  get returnLabel(): string {
    if (this.route.snapshot.queryParamMap.get('from') === 'progress')
      return 'Voltar à evolução de treinos';
    return this.route.snapshot.queryParamMap.get('from') === 'history' ||
      this.session()?.status === 'CLOSED'
      ? 'Voltar ao histórico de sessões'
      : 'Voltar ao planejamento de treinos';
  }

  openExerciseProgress(exerciseId: number): void {
    const session = this.session();
    const activity = session?.activities.find((item) => item.exerciseId === exerciseId);
    if (this.busy() || session?.status !== 'CLOSED' || !activity || exerciseId <= 0) return;
    void this.router.navigate(['/workout-sessions/progress'], {
      queryParams: {
        ...progressNavigationQuery(this.route.snapshot.queryParamMap),
        exerciseId,
        sourceSessionId: session.id,
        sourceDate: session.performedOn,
      },
      state: { exerciseName: activity.exerciseNameSnapshot },
    });
  }

  openSourceCycle(): void {
    const id = this.session()?.workoutCycleId;
    if (!this.busy() && id !== null && id !== undefined) {
      void this.router.navigate(['/workout-planning', id]);
    }
  }
}
