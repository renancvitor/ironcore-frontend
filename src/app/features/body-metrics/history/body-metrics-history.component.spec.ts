import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ListBodyMetricsResponse } from '../body-metrics.models';
import { BodyMetricsService } from '../body-metrics.service';
import { BodyMetricsHistoryComponent } from './body-metrics-history.component';

registerLocaleData(localePt);

describe('BodyMetricsHistoryComponent', () => {
  const list = vi.fn();
  const openDialog = vi.fn();
  const navigate = vi.fn();
  const remove = vi.fn();
  const success = vi.fn();

  let fixture: ComponentFixture<BodyMetricsHistoryComponent>;
  let firstRequest: Subject<ListBodyMetricsResponse>;

  beforeEach(async () => {
    list.mockReset();
    openDialog.mockReset();
    navigate.mockReset();
    remove.mockReset();
    success.mockReset();
    firstRequest = new Subject<ListBodyMetricsResponse>();
    list.mockReturnValue(firstRequest.asObservable());

    await TestBed.configureTestingModule({
      imports: [BodyMetricsHistoryComponent],
      providers: [
        { provide: BodyMetricsService, useValue: { list, delete: remove } },
        { provide: ToastService, useValue: { success } },
        { provide: DialogService, useValue: { open: openDialog } },
        { provide: Router, useValue: { navigate } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BodyMetricsHistoryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows loading while the initial backend page is pending', () => {
    expect(list).toHaveBeenCalledExactlyOnceWith(undefined, undefined);
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  describe('deletion', () => {
    let confirmation: Subject<boolean | undefined>;
    let deletion: Subject<void>;
    let reload: Subject<ListBodyMetricsResponse>;
    const record = {
      id: 42,
      measuredAt: '2026-09-30T08:30:00',
      weightKg: 82,
      heightCm: 178,
      notes: 'Excluir este registro',
    };
    const remaining = { ...record, id: 43, notes: 'Registro preservado' };
    const page = (content = [record, remaining], totalElements = 21): ListBodyMetricsResponse => ({
      metrics: {
        content,
        page: 0,
        size: 20,
        totalElements,
        totalPages: Math.ceil(totalElements / 20),
        last: totalElements <= 20,
      },
    });
    const buttons = () =>
      fixture.nativeElement.querySelectorAll(
        '.ic-body-metrics-history__delete-button',
      ) as NodeListOf<HTMLButtonElement>;
    const paginator = () =>
      fixture.debugElement.query(By.directive(MatPaginator)).componentInstance as MatPaginator;

    beforeEach(() => {
      confirmation = new Subject<boolean | undefined>();
      deletion = new Subject<void>();
      reload = new Subject<ListBodyMetricsResponse>();
      openDialog.mockReturnValue(confirmation.asObservable());
      remove.mockReturnValue(deletion.asObservable());
      firstRequest.next(page());
      firstRequest.complete();
      list.mockReturnValue(reload.asObservable());
      fixture.detectChanges();
    });

    function confirm(): void {
      buttons()[0].click();
      confirmation.next(true);
      confirmation.complete();
      fixture.detectChanges();
    }

    it('opens confirmation without activating the row or deleting before confirmation', () => {
      for (const key of ['Enter', ' ']) {
        buttons()[0].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      }
      expect(navigate).not.toHaveBeenCalled();
      buttons()[0].click();
      expect(openDialog).toHaveBeenCalledExactlyOnceWith({
        title: 'Excluir avaliação corporal',
        message:
          'Esta ação é permanente e não poderá ser desfeita. Deseja realmente excluir esta avaliação?',
        primaryAction: 'Excluir',
        secondaryAction: 'Cancelar',
      });
      expect(remove).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it.each([false, undefined])('preserves the page when confirmation closes with %s', (answer) => {
      buttons()[0].click();
      confirmation.next(answer);
      confirmation.complete();
      fixture.detectChanges();
      expect(remove).not.toHaveBeenCalled();
      expect(list).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.metrics()).toEqual(page());
      expect(buttons()[0].disabled).toBe(false);
      expect(success).not.toHaveBeenCalled();
    });

    it('blocks further deletion, pagination and local navigation while DELETE is pending', () => {
      confirm();
      expect(remove).toHaveBeenCalledExactlyOnceWith(42);
      expect(buttons()[0].disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('p[role="status"]').textContent).toContain(
        'Excluindo avaliação corporal',
      );
      buttons()[1].click();
      paginator().nextPage();
      (fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement).click();
      for (const button of fixture.nativeElement.querySelectorAll(
        'app-button button',
      ) as NodeListOf<HTMLButtonElement>)
        button.click();
      expect(openDialog).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('reports success once and reloads the records and pagination', () => {
      confirm();
      deletion.next();
      deletion.complete();
      fixture.detectChanges();
      expect(success).toHaveBeenCalledExactlyOnceWith('Avaliação corporal excluída com sucesso.');
      expect(list).toHaveBeenCalledTimes(2);
      expect(list).toHaveBeenLastCalledWith(undefined, undefined);
      expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain(record.notes);
      reload.next(page([remaining], 20));
      reload.complete();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(remaining.notes);
      expect(fixture.nativeElement.textContent).not.toContain(record.notes);
      expect(paginator().length).toBe(20);
      expect(paginator().pageIndex).toBe(0);
      expect(paginator().hasNextPage()).toBe(false);
      expect(fixture.nativeElement.querySelector('p[role="status"]')).toBeNull();
      expect(success).toHaveBeenCalledTimes(1);
    });

    it('shows the empty state after deleting the last evaluation', () => {
      fixture.componentInstance.metrics.set(page([record], 1));
      fixture.detectChanges();
      confirm();
      deletion.next();
      deletion.complete();
      reload.next(page([], 0));
      reload.complete();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Nenhuma avaliação corporal encontrada.');
      expect(fixture.nativeElement.querySelector('mat-paginator')).toBeNull();
    });

    it.each([
      [{ message: 'Exclusão indisponível.' }, 'Exclusão indisponível.'],
      [null, 'Não foi possível excluir a avaliação corporal.'],
    ])('preserves data and permits retry after DELETE fails with %j', (error, message) => {
      confirm();
      deletion.error(new HttpErrorResponse({ status: 500, error }));
      fixture.detectChanges();
      expect(openDialog).toHaveBeenLastCalledWith({
        title: 'Não foi possível excluir a avaliação corporal',
        message,
        primaryAction: 'Ok',
      });
      expect(fixture.componentInstance.metrics()).toEqual(page());
      expect(buttons()[0].disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('p[role="status"]')).toBeNull();
      expect(list).toHaveBeenCalledTimes(1);
      expect(success).not.toHaveBeenCalled();
      confirmation = new Subject<boolean | undefined>();
      deletion = new Subject<void>();
      openDialog.mockReturnValue(confirmation.asObservable());
      remove.mockReturnValue(deletion.asObservable());
      confirm();
      expect(remove).toHaveBeenCalledTimes(2);
      expect(remove).toHaveBeenLastCalledWith(42);
    });

    it('does not restore a deleted record when reloading fails', () => {
      confirm();
      deletion.next();
      deletion.complete();
      openDialog.mockReturnValue(new Subject<boolean | undefined>().asObservable());
      reload.error(new HttpErrorResponse({ status: 500 }));
      fixture.detectChanges();
      expect(fixture.componentInstance.metrics()).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain(record.notes);
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
      expect(openDialog).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'Não foi possível carregar os dados corporais' }),
      );
      expect(success).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the backend page in its received order with localized values', () => {
    firstRequest.next({
      metrics: {
        content: [
          {
            id: 2,
            measuredAt: '2026-09-30T08:30:00',
            weightKg: 82.4,
            heightCm: 178.5,
            notes: 'Após treino',
          },
          { id: 1, measuredAt: '2026-09-29T08:30:00', weightKg: 83, heightCm: 178, notes: null },
        ],
        page: 0,
        size: 20,
        totalElements: 42,
        totalPages: 3,
        last: false,
      },
    });
    firstRequest.complete();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      'tr[mat-row]',
    ) as NodeListOf<HTMLTableRowElement>;
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;

    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('30/09/2026 08:30');
    expect(rows[0].textContent).toContain('82,4 kg');
    expect(rows[0].textContent).toContain('178,5 cm');
    expect(rows[0].textContent).toContain('Após treino');
    expect(rows[1].textContent).toContain('29/09/2026 08:30');
    expect(rows[1].textContent).toContain('—');
    expect(paginator.length).toBe(42);
    expect(paginator.pageIndex).toBe(0);
    expect(paginator.pageSize).toBe(20);
  });

  it('shows the global empty state when the backend reports no records', () => {
    firstRequest.next({
      metrics: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
    });
    firstRequest.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma avaliação corporal encontrada.');
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeNull();
  });

  it('keeps pagination available when the requested page is empty but records exist', () => {
    firstRequest.next({
      metrics: { content: [], page: 2, size: 20, totalElements: 21, totalPages: 2, last: true },
    });
    firstRequest.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma avaliação disponível nesta página.',
    );
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeTruthy();
  });

  it('requests the next page from the backend when the paginator advances', () => {
    firstRequest.next({
      metrics: {
        content: [
          { id: 1, measuredAt: '2026-09-30T08:30:00', weightKg: 82, heightCm: 178, notes: null },
        ],
        page: 0,
        size: 20,
        totalElements: 42,
        totalPages: 3,
        last: false,
      },
    });
    firstRequest.complete();
    fixture.detectChanges();

    const nextRequest = new Subject<ListBodyMetricsResponse>();
    list.mockReturnValue(nextRequest.asObservable());
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;
    paginator.nextPage();
    fixture.detectChanges();

    expect(list).toHaveBeenLastCalledWith(1, 20);
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
  });

  it('opens the selected evaluation from the history row', () => {
    firstRequest.next({
      metrics: {
        content: [
          { id: 42, measuredAt: '2026-09-30T08:30:00', weightKg: 82, heightCm: 178, notes: null },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      },
    });
    firstRequest.complete();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLTableRowElement;
    row.click();

    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics', 42]);
  });

  it('opens a focused history row with Enter or Space', () => {
    firstRequest.next({
      metrics: {
        content: [
          { id: 42, measuredAt: '2026-09-30T08:30:00', weightKg: 82, heightCm: 178, notes: null },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      },
    });
    firstRequest.complete();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLTableRowElement;
    expect(row.tabIndex).toBe(0);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    row.dispatchEvent(space);

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/body-metrics', 42]);
    expect(space.defaultPrevented).toBe(true);
  });

  it('opens evolution from the header action even while history loads', () => {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('app-button button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Ver evolução'))!;
    expect(button.textContent).toContain('Ver evolução');
    button.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics/progress']);
  });

  it.each(['loading', 'empty'] as const)('opens creation from the %s history', (state) => {
    if (state === 'empty') {
      firstRequest.next({
        metrics: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
      });
      firstRequest.complete();
      fixture.detectChanges();
    }
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('app-button button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Nova avaliação'))!;
    button.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics/create']);
  });

  it('shows the backend error and navigates home only after the dialog closes', () => {
    const dialogClosed = new Subject<boolean | undefined>();
    openDialog.mockReturnValue(dialogClosed.asObservable());

    firstRequest.error(
      new HttpErrorResponse({ error: { message: 'Serviço indisponível.' }, status: 500 }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível carregar os dados corporais',
      message: 'Serviço indisponível.',
      primaryAction: 'Ok',
    });
    expect(navigate).not.toHaveBeenCalled();

    dialogClosed.next(true);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('uses a fallback message when the backend does not provide one', () => {
    openDialog.mockReturnValue(new Subject<boolean | undefined>().asObservable());

    firstRequest.error(new HttpErrorResponse({ status: 500 }));

    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível carregar os dados corporais',
      message: 'Não foi possível carregar os dados corporais.',
      primaryAction: 'Ok',
    });
  });
});
