import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { ToastService } from '../../shared/components/toast/toast.service';
import { GetBodyMetricsResponse } from './body-metrics.models';

describe('body metrics editing across routes', () => {
  const endpoint = '/api/users/me/body-metrics';
  let http: HttpTestingController;
  const success = vi.fn();

  beforeEach(() => {
    success.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: ToastService, useValue: { success } },
      ],
    });
    TestBed.inject(AuthStateService).setUser({
      userId: 1,
      email: 'test@example.test',
      nickname: 'Teste',
      mustChangePassword: false,
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('PUTs only editable fields and reloads history, summaries, charts and comparison after editing', async () => {
    const harness = await RouterTestingHarness.create();
    const original: GetBodyMetricsResponse = {
      id: 42,
      personId: 1,
      measuredAt: '2026-10-08T08:30:00',
      weightKg: 80,
      heightCm: 180,
      bmi: 24.69,
      circumferences: {
        neckCm: 35,
        chestCm: null,
        shoulderCm: null,
        armCm: null,
        forearmCm: null,
        waistCm: 85,
        hipCm: null,
        thighCm: null,
        calfCm: null,
      },
      bodyFatPercentage: 20,
      fatMassKg: 16,
      leanMassKg: 64,
      notes: 'Antes da edição',
      updatedAt: null,
    };
    const updated: GetBodyMetricsResponse = {
      ...original,
      weightKg: 78,
      bmi: 24.07,
      bodyFatPercentage: 18,
      fatMassKg: 14.04,
      leanMassKg: 63.96,
      circumferences: { ...original.circumferences!, waistCm: 82 },
      notes: 'Depois da edição',
      updatedAt: '2026-10-09T10:00:00',
    };

    async function visitDependentScreens(metric: GetBodyMetricsResponse) {
      await harness.navigateByUrl('/body-metrics');
      const history = http.expectOne((req) => req.url === endpoint);
      expect(history.request.method).toBe('GET');
      history.flush({
        metrics: {
          content: [metric],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          last: true,
        },
      });
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain(metric.notes);

      for (const path of ['/', '/body-metrics/latest']) {
        await harness.navigateByUrl(path);
        const latest = http.expectOne(`${endpoint}/latest`);
        expect(latest.request.method).toBe('GET');
        latest.flush(metric);
        if (path === '/') {
          const summary = http.expectOne((req) => req.url === `${endpoint}/progress/changes`);
          const delta = metric.weightKg - 82;
          summary.flush({
            startDate: summary.request.params.get('startDate'),
            endDate: summary.request.params.get('endDate'),
            changes: [
              {
                metric: 'WEIGHT_KG',
                label: 'Peso',
                unit: 'kg',
                firstDate: '2026-10-01',
                lastDate: '2026-10-08',
                firstValue: 82,
                lastValue: metric.weightKg,
                absoluteChange: delta,
                percentageChange: (delta / 82) * 100,
              },
            ],
          });
          harness.detectChanges();
          expect(
            harness.routeNativeElement!.querySelector('app-body-metrics-progress-card')!
              .textContent,
          ).toContain(`${delta} kg`);
        }
        harness.detectChanges();
        expect(
          harness.routeNativeElement?.querySelector('app-body-metrics-latest')?.textContent,
        ).toContain(String(metric.weightKg));
      }

      await harness.navigateByUrl('/body-metrics/progress');
      const charts = [
        ['BODY_COMPOSITION', 'body-composition', 'WEIGHT_KG', 'Peso', 'kg', metric.weightKg],
        [
          'CIRCUMFERENCES',
          'circumferences',
          'WAIST_CM',
          'Cintura',
          'cm',
          metric.circumferences!.waistCm!,
        ],
        ['BODY_FAT', 'body-fat', 'BODY_FAT_PERCENTAGE', 'Gordura', '%', metric.bodyFatPercentage!],
      ] as const;
      for (const [type, path, key, label, unit, value] of charts) {
        if (type !== 'BODY_COMPOSITION') {
          harness
            .routeNativeElement!.querySelector<HTMLInputElement>(`input[value="${type}"]`)!
            .click();
          harness.detectChanges();
        }
        const chart = http.expectOne((req) => req.url === `${endpoint}/progress/${path}`);
        expect(chart.request.method).toBe('GET');
        chart.flush({
          startDate: chart.request.params.get('startDate'),
          endDate: chart.request.params.get('endDate'),
          chartType: type,
          series: [{ metric: key, label, unit, points: [{ period: '2026-10-08', value }] }],
        });
        harness.detectChanges();
        const rendered = harness.routeNativeElement!.querySelector(
          'app-body-metrics-progress-chart',
        );
        expect(rendered).toBeTruthy();
        expect(rendered!.textContent).toContain(String(value));
      }
      harness
        .routeNativeElement!.querySelector<HTMLInputElement>('input[value="CHANGES"]')!
        .click();
      harness.detectChanges();
      const comparison = http.expectOne((req) => req.url === `${endpoint}/progress/changes`);
      expect(comparison.request.method).toBe('GET');
      comparison.flush({
        startDate: comparison.request.params.get('startDate'),
        endDate: comparison.request.params.get('endDate'),
        changes: [
          {
            metric: 'WEIGHT_KG',
            label: 'Peso',
            unit: 'kg',
            firstDate: '2026-10-01',
            firstValue: 82,
            lastDate: '2026-10-08',
            lastValue: metric.weightKg,
            absoluteChange: metric.weightKg - 82,
            percentageChange: ((metric.weightKg - 82) / 82) * 100,
          },
        ],
      });
      harness.detectChanges();
      expect(
        harness.routeNativeElement!.querySelector('app-body-metrics-progress-changes')!.textContent,
      ).toContain(`${metric.weightKg} kg`);
    }

    await visitDependentScreens(original);
    await harness.navigateByUrl('/body-metrics/42');
    http.expectOne(`${endpoint}/42`).flush(original);
    harness.detectChanges();
    Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find((button) => button.getAttribute('aria-label') === 'Editar avaliação')!
      .click();
    harness.detectChanges();
    for (const [name, value] of [
      ['weightKg', '78'],
      ['waistCm', '82'],
      ['notes', updated.notes!],
    ]) {
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(`#${name}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    const put = http.expectOne(`${endpoint}/42`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      weightKg: updated.weightKg,
      heightCm: updated.heightCm,
      circumferences: updated.circumferences,
      notes: updated.notes,
    });
    expect(success).not.toHaveBeenCalled();
    put.flush(updated);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(updated.notes);
    expect(harness.routeNativeElement?.querySelector('input')).toBeNull();
    expect(success).toHaveBeenCalledExactlyOnceWith('Dados corporais atualizados com sucesso.');
    await visitDependentScreens(updated);
    await harness.navigateByUrl('/body-metrics/42');
    const detail = http.expectOne(`${endpoint}/42`);
    expect(detail.request.method).toBe('GET');
    detail.flush(updated);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(updated.notes);
    expect(harness.routeNativeElement?.textContent).not.toContain(original.notes);
  });
});
