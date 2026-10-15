import { ProfileResponse } from '../../api';
import { isFutureDate, monthYear } from '../i18n/format';
import { Lang } from '../i18n/route-table';
import type { AvailabilityStatus } from '../../shared/ui/availability.component';

/**
 * What `ui-availability` shows (services and contact pages): nothing unless enabled in settings; the "from"
 * month only while that date is still ahead and the status isn't CLOSED.
 */
export function availabilityView(
  profile: ProfileResponse | null,
  lang: Lang,
): { status: AvailabilityStatus; from: string | null } | null {
  const availability = profile?.availability;
  if (!availability?.visible || !availability.status) {
    return null;
  }
  const status = availability.status as AvailabilityStatus;
  const from =
    status !== 'CLOSED' && availability.from && isFutureDate(availability.from)
      ? monthYear(availability.from, lang)
      : null;
  return { status, from };
}
