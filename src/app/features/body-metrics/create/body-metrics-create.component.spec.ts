import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { BodyMetricsCreateComponent } from './body-metrics-create.component';

describe('BodyMetricsCreateComponent', () => {
  const endpoint = '/api/users/me/body-metrics';
  const circumferenceFields = [
    'neckCm',
    'chestCm',
    'shoulderCm',
    'armCm',
    'forearmCm',
    'waistCm',
    'hipCm',
    'thighCm',
    'calfCm',
  ] as const;
  const numericFields = ['weightKg', 'heightCm', ...circumferenceFields] as const;
  const navigate = vi.fn();
  const openDialog = vi.fn();
  const success = vi.fn();
  let fixture: ComponentFixture<BodyMetricsCreateComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    navigate.mockReset().mockResolvedValue(true);
    openDialog.mockReset().mockReturnValue(of(true));
    success.mockReset();
    await TestBed.configureTestingModule({
      imports: [BodyMetricsCreateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: Router, useValue: { navigate } },
        { provide: DialogService, useValue: { open: openDialog } },
        { provide: ToastService, useValue: { success } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BodyMetricsCreateComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function fill(name: string, value: number | string): void {
    const input = fixture.nativeElement.querySelector(`#${name}`) as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function fillRequired(): void {
    fill('weightKg', 80);
    fill('heightCm', 180);
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  function submit(): void {
    submitButton().click();
    fixture.detectChanges();
  }

  it('requires weight and height and reveals their errors on submit', () => {
    submit();
    expect(fixture.nativeElement.querySelector('#weightKg-error').textContent).toContain(
      'Informe o peso.',
    );
    expect(fixture.nativeElement.querySelector('#heightCm-error').textContent).toContain(
      'Informe a altura.',
    );
    http.expectNone(endpoint);
  });

  it.each(numericFields)('blocks invalid %s values with an associated visible error', (field) => {
    fillRequired();
    const max = field === 'weightKg' ? 500 : 300;
    for (const value of [0, -1, max + 1]) {
      fill(field, value);
      submit();
      const input = fixture.nativeElement.querySelector(`#${field}`) as HTMLInputElement;
      const error = fixture.nativeElement.querySelector(`#${field}-error`) as HTMLElement;
      expect(error.textContent).toContain(value > max ? `ultrapassar ${max}` : 'maior');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(error.id);
      http.expectNone(endpoint);
    }
  });

  it('reveals a circumference error on blur and clears it after correction', () => {
    fill('neckCm', 0);
    expect(fixture.nativeElement.querySelector('#neckCm-error')).toBeNull();
    fixture.nativeElement.querySelector('#neckCm').dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#neckCm-error').textContent).toContain(
      'maior que zero',
    );
    fill('neckCm', 35);
    expect(fixture.nativeElement.querySelector('#neckCm-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('#neckCm').getAttribute('aria-invalid')).toBe(
      'false',
    );
  });

  it.each(numericFields)(
    'accepts the inclusive maximum and small positive values for %s',
    (field) => {
      fillRequired();
      for (const value of [field === 'weightKg' ? 500 : 300, 0.005]) {
        fill(field, value);
        expect(fixture.componentInstance.form.valid).toBe(true);
      }
    },
  );

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite model values (%s) before sending a request',
    (value) => {
      fillRequired();
      for (const field of numericFields) {
        const control = fixture.componentInstance.form.controls[field];
        const previous = control.value;
        control.setValue(value);
        submit();
        expect(control.invalid).toBe(true);
        http.expectNone(endpoint);
        control.setValue(previous);
      }
    },
  );

  it('posts only contract inputs and converts cleared optional measurements to null', () => {
    fillRequired();
    fill('neckCm', 35);
    fill('neckCm', '');
    submit();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      weightKg: 80,
      heightCm: 180,
      circumferences: null,
      notes: null,
    });
    request.flush({ id: 42 });
  });

  it('preserves every supplied circumference and notes in the POST payload', () => {
    fillRequired();
    const circumferences = {
      neckCm: 35,
      chestCm: 100,
      shoulderCm: 110,
      armCm: 32,
      forearmCm: 28,
      waistCm: 85,
      hipCm: 95,
      thighCm: 55,
      calfCm: 38,
    };
    for (const field of circumferenceFields) fill(field, circumferences[field]);
    fill('notes', 'Avaliação pela manhã');
    submit();
    const request = http.expectOne(endpoint);
    expect(request.request.body).toEqual({
      weightKg: 80,
      heightCm: 180,
      circumferences,
      notes: 'Avaliação pela manhã',
    });
    request.flush({ id: 42 });
  });

  it('allows a partial set of circumferences without making calculation inputs mandatory', () => {
    fillRequired();
    fill('armCm', 32);
    submit();
    const request = http.expectOne(endpoint);
    expect(request.request.body.circumferences).toEqual({
      neckCm: null,
      chestCm: null,
      shoulderCm: null,
      armCm: 32,
      forearmCm: null,
      waistCm: null,
      hipCm: null,
      thighCm: null,
      calfCm: null,
    });
    request.flush({ id: 42 });
  });

  it('disables the actions while saving and prevents another click from posting twice', async () => {
    fillRequired();
    submit();
    const request = http.expectOne(endpoint);
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Salvando...');
    const cancel = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    submit();
    cancel.click();
    http.expectNone(endpoint);
    expect(navigate).not.toHaveBeenCalled();
    request.flush({ id: 42 });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics', 42]);
    expect(success).toHaveBeenCalledExactlyOnceWith('Avaliação corporal cadastrada com sucesso.');
  });

  it('waits for successful detail navigation before showing the success toast', async () => {
    let finishNavigation!: (value: boolean) => void;
    navigate.mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishNavigation = resolve;
      }),
    );
    fillRequired();
    submit();
    http.expectOne(endpoint).flush({ id: 42 });
    expect(success).not.toHaveBeenCalled();
    finishNavigation(true);
    await fixture.whenStable();
    expect(success).toHaveBeenCalledOnce();
  });

  it.each([
    [
      400,
      { message: 'Circunferência da cintura deve ser maior do que a circunferência do pescoço.' },
      'Circunferência da cintura deve ser maior do que a circunferência do pescoço.',
    ],
    [500, null, 'Não foi possível cadastrar os dados corporais.'],
  ])('shows an HTTP %s error, preserves inputs and allows retry', (status, body, message) => {
    fillRequired();
    fill('notes', 'Preservar observação');
    submit();
    http.expectOne(endpoint).flush(body, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(openDialog).toHaveBeenCalledExactlyOnceWith({
      title: 'Não foi possível cadastrar os dados corporais',
      message,
      primaryAction: 'Ok',
    });
    expect(success).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(submitButton().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('#notes').value).toBe('Preservar observação');
    submit();
    const retry = http.expectOne(endpoint);
    expect(retry.request.body.notes).toBe('Preservar observação');
    retry.flush({ id: 42 });
  });

  it('cancels back to history without saving', () => {
    fixture.nativeElement.querySelector('button[type="button"]').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/body-metrics']);
    http.expectNone(endpoint);
  });
});
