import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { WorkoutDayFormComponent } from './workout-day-form.component';
import { WorkoutDayDetailResponse } from '../workout-planning.models';
import { createWorkoutDayForm } from '../workout-day.form';

describe('WorkoutDayFormComponent', () => {
  let fixture: ComponentFixture<WorkoutDayFormComponent>;
  const days: WorkoutDayDetailResponse[] = [
    { id: 1, title: 'Treino A', weekDay: 'MONDAY', sortOrder: 2, activities: [] },
    { id: 2, title: 'Treino B', weekDay: 'MONDAY', sortOrder: 1, activities: [] },
    { id: 3, title: 'Treino C', weekDay: 'FRIDAY', sortOrder: 1, activities: [] },
  ];

  async function create(mode: 'create' | 'edit' | 'reorder', day = days[0]) {
    await TestBed.configureTestingModule({
      imports: [WorkoutDayFormComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WorkoutDayFormComponent);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('days', days);
    const form = createWorkoutDayForm(mode, () => days, mode === 'create' ? null : day.id);
    if (mode !== 'create')
      form.reset({ title: day.title, weekDay: day.weekDay, sortOrder: day.sortOrder });
    fixture.componentRef.setInput('form', form);
    if (mode !== 'create') fixture.componentRef.setInput('day', day);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('offers all seven weekdays and delegates submission to the screen', async () => {
    const component = await create('create');
    const submit = vi.fn();
    component.submitted.subscribe(submit);
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    await select.open();
    expect(
      await Promise.all((await select.getOptions()).map((option) => option.getText())),
    ).toEqual([
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ]);
    await select.clickOptions({ text: 'Quarta-feira' });
    component.form().controls.title.setValue('  Treino novo  ');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(submit).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(component.form().getRawValue()).toEqual({
      title: '  Treino novo  ',
      weekDay: 'WEDNESDAY',
      sortOrder: 1,
    });
  });

  it.each(['create', 'edit'] as const)(
    'shows title validation from the supplied form in %s',
    async (mode) => {
      const component = await create(mode);
      component.form().controls.title.setValue('   ');
      component.form().markAllAsTouched();
      fixture.detectChanges();
      expect(component.form().controls.title.touched).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Informe o título.');
    },
  );

  it('offers destination positions, resets selection on weekday change and supports an empty day', async () => {
    const component = await create('reorder');
    expect(component.positions()).toEqual([1, 2]);
    expect(fixture.nativeElement.querySelector('[formControlName="sortOrder"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h3').textContent).toContain(
      'Alterar dia ou posi\u00e7\u00e3o',
    );
    expect(component.form().controls.sortOrder.value).toBe(2);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const select = await loader.getHarness(
      MatSelectHarness.with({ selector: '[formControlName="weekDay"]' }),
    );
    await select.open();
    await select.clickOptions({ text: 'Sexta-feira' });
    expect(component.form().controls.sortOrder.value).toBe(1);
    expect(component.positions()).toEqual([1, 2]);
    await select.open();
    await select.clickOptions({ text: 'Domingo' });
    expect(component.positions()).toEqual([1]);
    expect(component.form().controls.sortOrder.value).toBe(1);
    expect(component.form().valid).toBe(true);
    expect(fixture.nativeElement.querySelector('[formControlName="sortOrder"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-input')).toBeNull();
    const submit = vi.fn();
    component.submitted.subscribe(submit);
    for (const sortOrder of [0, -1, 1.5, 2]) {
      component.form().controls.sortOrder.setValue(sortOrder);
      expect(component.form().invalid).toBe(true);
    }
    expect(submit).not.toHaveBeenCalled();
    component.form().controls.sortOrder.setValue(1);
    component.submit();
    expect(submit).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(days.map((day) => day.sortOrder)).toEqual([2, 1, 1]);
  });

  it('hides the only position and shows destination positions when moving a single session', async () => {
    const component = await create('reorder', days[2]);
    expect(component.positions()).toEqual([1]);
    expect(fixture.nativeElement.querySelector('[formControlName="sortOrder"]')).toBeNull();
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatSelectHarness.with({ selector: '[formControlName="weekDay"]' }),
    );
    await select.open();
    await select.clickOptions({ text: 'Segunda-feira' });
    expect(component.positions()).toEqual([1, 2, 3]);
    expect(fixture.nativeElement.querySelector('[formControlName="sortOrder"]')).not.toBeNull();
    const position = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatSelectHarness.with({ selector: '[formControlName="sortOrder"]' }),
    );
    await position.open();
    const options = await position.getOptions();
    await options[2].click();
    expect(component.form().controls.sortOrder.value).toBe(3);
    await select.open();
    await select.clickOptions({ text: 'Domingo' });
    expect(component.form().controls.sortOrder.value).toBe(1);
    expect(component.form().valid).toBe(true);
    expect(fixture.nativeElement.querySelector('[formControlName="sortOrder"]')).toBeNull();
  });

  it('renders the disabled form and blocks submission and actions while saving', async () => {
    const component = await create('edit');
    const submit = vi.fn();
    component.submitted.subscribe(submit);
    fixture.componentRef.setInput('saving', true);
    component.form().disable();
    await fixture.whenStable();
    fixture.detectChanges();
    component.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(component.form().disabled).toBe(true);
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).every((button) => button.disabled),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
    fixture.componentRef.setInput('saving', false);
    component.form().enable();
    await fixture.whenStable();
    expect(component.form().enabled).toBe(true);
  });
});
