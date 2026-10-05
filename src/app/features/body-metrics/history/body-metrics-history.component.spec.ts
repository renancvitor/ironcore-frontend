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
import { ListBodyMetricsResponse } from '../body-metrics.models';
import { BodyMetricsService } from '../body-metrics.service';
import { BodyMetricsHistoryComponent } from './body-metrics-history.component';

registerLocaleData(localePt);

describe('BodyMetricsHistoryComponent', () => {
  const list = vi.fn();
  const openDialog = vi.fn();
  const navigate = vi.fn();

  let fixture: ComponentFixture<BodyMetricsHistoryComponent>;
  let firstRequest: Subject<ListBodyMetricsResponse>;

  beforeEach(async () => {
    list.mockReset();
    openDialog.mockReset();
    navigate.mockReset();
    firstRequest = new Subject<ListBodyMetricsResponse>();
    list.mockReturnValue(firstRequest.asObservable());

    await TestBed.configureTestingModule({
      imports: [BodyMetricsHistoryComponent],
      providers: [
        { provide: BodyMetricsService, useValue: { list } },
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
    const button = fixture.nativeElement.querySelector('app-button button') as HTMLButtonElement;
    expect(button.textContent).toContain('Ver evolução');
    button.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics/progress']);
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
