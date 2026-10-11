import { CanDeactivateFn } from '@angular/router';

import type { BodyMetricsHistoryComponent } from './body-metrics-history.component';

export const bodyMetricsHistoryGuard: CanDeactivateFn<BodyMetricsHistoryComponent> = (component) =>
  component.deletingId() === null;
