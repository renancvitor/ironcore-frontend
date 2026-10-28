import { TestBed } from '@angular/core/testing';
import { ANALYTICS_INDICATORS } from '../workout-session-progress.utils';
import { cardioPoint, strengthPoint } from '../workout-session-progress.testing';
import { WorkoutSessionProgressChartComponent } from './workout-session-progress-chart.component';
import { ExerciseEvolutionPoint } from '../../workout-session-analytics.models';

describe('Workout Session native SVG chart', () => {
  function render(points: ExerciseEvolutionPoint[], metric = ANALYTICS_INDICATORS[0]) {
    const fixture = TestBed.createComponent(WorkoutSessionProgressChartComponent);
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('indicator', metric);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('uses the Body Metrics palette, grid and line styling with a stable indicator color', () => {
    const { fixture, element } = render([strengthPoint(), strengthPoint({ sessionId: 101 })]);
    expect(element.querySelector('path')?.getAttribute('stroke-width')).toBe('3');
    expect(element.querySelector('path')?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(element.querySelectorAll('.ic-chart__grid')).toHaveLength(5);
    expect(element.querySelector('.ic-chart__marker')?.getAttribute('fill')).toBe(
      'var(--ic-chart-series-1)',
    );
    fixture.componentRef.setInput('indicator', ANALYTICS_INDICATORS[1]);
    fixture.detectChanges();
    expect(element.querySelector('.ic-chart__marker')?.getAttribute('fill')).toBe(
      'var(--ic-chart-series-2)',
    );
    fixture.componentRef.setInput('indicator', ANALYTICS_INDICATORS[0]);
    fixture.detectChanges();
    expect(element.querySelector('.ic-chart__marker')?.getAttribute('fill')).toBe(
      'var(--ic-chart-series-1)',
    );
    const styles = [...document.querySelectorAll('style')]
      .map((style) => style.textContent)
      .join('');
    for (const color of [
      '#5fe080',
      '#61acff',
      '#ff7a00',
      '#a476ff',
      '#5fe0df',
      '#ff3030',
      '#147d38',
      '#135cb3',
      '#b84a00',
      '#5b21b6',
      '#007b83',
      '#c91414',
    ])
      expect(styles).toContain(color);
  });

  it('keeps repeated times distinct while identifying rows by date and workout, without codes or selection controls', () => {
    const { fixture, element } = render([strengthPoint(), strengthPoint({ sessionId: 101 })]);
    const circles = [...element.querySelectorAll('.ic-chart__marker')];
    expect(circles).toHaveLength(2);
    expect(circles[0].getAttribute('cx')).not.toBe(circles[1].getAttribute('cx'));
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector('select')).toBeNull();
    expect(element.querySelector('details')).toBeNull();
    expect(element.querySelector('.ic-chart__point-detail')).toBeNull();
    expect(element.textContent).not.toMatch(/Sessão 100|Sessão 101|Cobertura dos registros/);
    expect(
      [...element.querySelectorAll('thead th')].map((cell) => cell.textContent?.trim()),
    ).toEqual(['Início (São Paulo)', 'Treino', 'Maior carga normalizada executada (kg)']);
    expect(element.querySelector('tbody')?.textContent).toContain('Peito e braços');
    expect(element.querySelector('tbody')?.textContent).toContain('10:00:00');
    const open = vi.fn();
    fixture.componentInstance.sessionOpened.subscribe(open);
    element.querySelectorAll<HTMLButtonElement>('.ic-chart__session-link')[1].click();
    expect(open).toHaveBeenCalledExactlyOnceWith(101);
  });

  it('draws zero and breaks paths across null without losing a table row', () => {
    const { element } = render([
      strengthPoint({ maxNormalizedLoadKg: 0 }),
      strengthPoint({ sessionId: 101 }),
      strengthPoint({ sessionId: 102, maxNormalizedLoadKg: null }),
      strengthPoint({ sessionId: 103 }),
      strengthPoint({ sessionId: 104 }),
    ]);
    expect(element.querySelectorAll('.ic-chart__line')).toHaveLength(2);
    expect(element.querySelectorAll('.ic-chart__marker')).toHaveLength(4);
    expect(element.querySelector('.ic-chart__marker')?.getAttribute('cy')).toBe('260');
    const rows = element.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain('0 kg');
    expect(rows[2].textContent).toContain('—');
  });

  it('shows one marker with no artificial line', () => {
    const { element } = render([strengthPoint({ maxNormalizedLoadKg: 0 })]);
    expect(element.querySelectorAll('.ic-chart__marker')).toHaveLength(1);
    expect(element.querySelector('.ic-chart__line')).toBeNull();
    expect(element.textContent).toContain('apenas um valor válido');
  });

  it('retains null-only records in the table without a numeric plot', () => {
    const { element } = render([
      strengthPoint({ maxNormalizedLoadKg: null, volumeKgReps: null, volumeSetCount: 0 }),
    ]);
    expect(element.querySelector('.ic-chart__plot')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain('—');
    expect(element.textContent).not.toContain('com carga:');
  });

  it('shows the backend decimal pace and useful point information without a detail card', () => {
    const { element } = render(
      [cardioPoint({ averagePaceMinPerKm: 6.67 })],
      ANALYTICS_INDICATORS[4],
    );
    expect(element.querySelector('tbody')?.textContent).toContain('6,67 min/km');
    const title = element.querySelector('.ic-chart__target title')?.textContent;
    expect(title).toContain('Peito e braços');
    expect(title).toContain('10:00:00');
    expect(title).toContain('6,67 min/km');
    expect(title).not.toContain('Sessão');
  });

  it('keeps every dense session, offers horizontal scrolling and thins only labels', () => {
    const { element } = render(
      Array.from({ length: 180 }, (_, index) => strengthPoint({ sessionId: index + 1 })),
    );
    expect(element.querySelectorAll('.ic-chart__marker')).toHaveLength(180);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(180);
    expect(element.querySelector('.ic-chart__plot')?.getAttribute('style')).toContain(
      'min-width: 11576px',
    );
    expect(element.querySelector('.ic-chart__scroll')?.getAttribute('tabindex')).toBe('0');
  });
});
