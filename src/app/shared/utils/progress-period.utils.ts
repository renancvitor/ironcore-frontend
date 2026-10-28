export interface ProgressPeriod {
  startDate: string;
  endDate: string;
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function defaultProgressPeriod(today = new Date()): ProgressPeriod {
  return {
    startDate: localDateString(new Date(today.getFullYear(), today.getMonth() - 5, 1)),
    endDate: localDateString(today),
  };
}

export function progressPeriodError(
  { startDate, endDate }: ProgressPeriod,
  today = localDateString(new Date()),
): string {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return 'Informe datas inicial e final válidas.';
  }
  if (startDate > today || endDate > today) return 'As datas não podem ser futuras.';
  if (startDate > endDate) return 'A data inicial não pode ser maior que a data final.';

  const [year, month, day] = startDate.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
  const maximum = new Date(Date.UTC(year + 1, month - 1, Math.min(day, lastDay)));
  maximum.setUTCDate(maximum.getUTCDate() - 1);
  if (endDate > maximum.toISOString().slice(0, 10)) {
    return 'O período máximo permitido é de 12 meses.';
  }
  return '';
}

function isValidDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
