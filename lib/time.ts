/**
 * A time of day (hour + minute) has to become a `Date` to hand to the native time
 * picker and to `toLocaleTimeString`. Which *calendar day* we pin it to is not
 * arbitrary.
 *
 * It must be a modern date. The obvious `new Date(0, 0, 0, h, m)` lands on
 * 1899-12-31, and before the 1920s most zones ran on Local Mean Time — offsets like
 * Nairobi's UTC+02:27:16 that are not a whole number of minutes. Engines disagree
 * about that remainder (Date arithmetic rounds to +02:27, ICU keeps the :16), so a
 * value written by one and read by the other lands 16s short, and `minute: '2-digit'`
 * truncates rather than rounds: 6:10 PM displays and re-saves as 6:09 PM.
 *
 * See time.test.ts. Today's date has a whole-minute offset everywhere.
 */
export function timeOfDay(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
