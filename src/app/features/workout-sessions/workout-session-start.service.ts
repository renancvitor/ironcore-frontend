import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, map, Observable, of, switchMap, take } from 'rxjs';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import {
  GetWorkoutSessionDetailResponse,
  StartWorkoutSessionRequest,
  StartWorkoutSessionResponse,
} from './workout-sessions.models';
import { WorkoutSessionsService } from './workout-sessions.service';

@Injectable()
export class WorkoutSessionStartService {
  private readonly sessions = inject(WorkoutSessionsService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  readonly needsRecovery = signal(false);

  start(
    request: StartWorkoutSessionRequest,
    refresh: () => void,
    recovered: (session: GetWorkoutSessionDetailResponse | null) => void = () => {},
  ): Observable<StartWorkoutSessionResponse | null> {
    if (this.needsRecovery()) {
      return this.recover(
        'Confira se a abertura anterior foi efetivada antes de iniciar outra sessão.',
        recovered,
      );
    }
    return this.sessions.startWorkoutSession(request).pipe(
      catchError((error) => {
        if (error.status === 401) return EMPTY;
        const message = error.error?.message ?? 'Não foi possível confirmar a abertura da sessão.';
        if (error.status === 409 || error.status === 0 || error.status >= 500) {
          this.needsRecovery.set(true);
          return this.recover(message, recovered).pipe(
            map(() => {
              if (error.status === 409) refresh();
              return null;
            }),
          );
        }
        this.dialog.open({
          title: 'Não foi possível iniciar a sessão de treino',
          message,
          primaryAction: 'Ok',
        });
        if (error.status === 400 || error.status === 404) refresh();
        return of(null);
      }),
    );
  }

  private recover(
    message: string,
    recovered: (session: GetWorkoutSessionDetailResponse | null) => void,
  ): Observable<null> {
    return this.sessions.getInProgressWorkoutSession().pipe(
      switchMap((session) => {
        this.needsRecovery.set(false);
        recovered(session);
        return this.dialog
          .open({
            title: session ? 'Sessão de treino em andamento' : 'Abertura da sessão de treino',
            message: session
              ? `${message} Há uma sessão de “${session.workoutDayTitleSnapshot}” em andamento. Deseja continuar visualizando essa sessão?`
              : `${message} Nenhuma sessão em andamento foi encontrada. Confira o planejamento antes de tentar novamente.`,
            primaryAction: session ? 'Continuar sessão' : 'Ok',
            ...(session ? { secondaryAction: 'Voltar' } : {}),
          })
          .pipe(
            take(1),
            map((confirmed) => {
              if (confirmed && session)
                void this.router.navigate(['/workout-sessions', session.id]);
              return null;
            }),
          );
      }),
      catchError((error) => {
        this.needsRecovery.set(true);
        if (error.status === 401) return EMPTY;
        this.dialog.open({
          title: 'Não foi possível recuperar a sessão de treino',
          message:
            error.error?.message ?? 'Consulte novamente antes de tentar iniciar outra sessão.',
          primaryAction: 'Ok',
        });
        return of(null);
      }),
    );
  }
}
