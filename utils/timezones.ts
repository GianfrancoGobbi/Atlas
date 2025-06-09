// utils/timezones.ts

// TARGET_TIMEZONE_IANA represents UTC-3.
export const TARGET_TIMEZONE_IANA = 'America/Argentina/Buenos_Aires';

/**
 * Formats a UTC ISO string (e.g., "2023-10-26T18:00:00Z") into a string
 * suitable for datetime-local input (YYYY-MM-DDTHH:MM) in the target timezone.
 * @param utcIsoString The UTC ISO string.
 * @param targetTimezone The IANA timezone name (e.g., 'America/Argentina/Buenos_Aires').
 * @returns Formatted string for datetime-local or empty string if input is invalid.
 */
export function formatUTCISOToDateTimeLocalInTargetTimezone(
  utcIsoString: string | undefined | null,
  targetTimezone: string
): string {
  if (!utcIsoString) {
    return '';
  }
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) {
      console.error(`formatUTCISOToDateTimeLocalInTargetTimezone: Invalid date from UTC ISO string: '${utcIsoString}'.`);
      return '';
    }

    const dateFormatter = new Intl.DateTimeFormat('en-CA', { // YYYY-MM-DD
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: targetTimezone,
    });
    const timeFormatter = new Intl.DateTimeFormat('en-GB', { // HH:MM (24-hour)
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: targetTimezone,
    });

    const dateParts = dateFormatter.formatToParts(date);
    const timeParts = timeFormatter.formatToParts(date);

    const year = dateParts.find(p => p.type === 'year')?.value;
    const month = dateParts.find(p => p.type === 'month')?.value;
    const day = dateParts.find(p => p.type === 'day')?.value;
    let hour = timeParts.find(p => p.type === 'hour')?.value;
    const minute = timeParts.find(p => p.type === 'minute')?.value;

    if (!year || !month || !day || !hour || !minute) {
      console.error("formatUTCISOToDateTimeLocalInTargetTimezone: Intl.DateTimeFormat could not extract all required date/time parts.");
      return '';
    }
    
    if (hour === '24') hour = '00'; // HTML datetime-local expects '00' for midnight

    return `${year}-${month}-${day}T${hour}:${minute}`;

  } catch (e: any) {
    console.error(`formatUTCISOToDateTimeLocalInTargetTimezone: Error during conversion for utcIsoString='${utcIsoString}'. Error: ${e.message}`, e);
    return '';
  }
}

/**
 * Converts a datetime-local string (YYYY-MM-DDTHH:MM), representing a wall-clock time
 * in the sourceTimezone, to a YYYY-MM-DDTHH:MM:SS string. This local time string
 * will be interpreted by Supabase server according to its timezone configuration.
 * @param dateTimeLocalString The YYYY-MM-DDTHH:MM string.
 * @param sourceTimezone The IANA timezone name where dateTimeLocalString is to be interpreted. (Currently unused in function logic but kept for signature consistency).
 * @returns YYYY-MM-DDTHH:MM:SS string or empty string if input is invalid.
 */
export function formatTargetTimezoneDateTimeLocalToUTCISO(
  dateTimeLocalString: string,
  sourceTimezone: string // Parameter kept for consistency, but not used as we send local time.
): string {
  if (!dateTimeLocalString) {
    return '';
  }
  
  const [datePart, timePart] = dateTimeLocalString.split('T');
  if (!datePart || !timePart) {
    console.error(`formatTargetTimezoneDateTimeLocalToUTCISO: dateTimeLocalString='${dateTimeLocalString}' is not in 'YYYY-MM-DDTHH:MM' format.`);
    return '';
  }

  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');

  if (!year || !month || !day || !hour || !minute ||
      isNaN(parseInt(year)) || isNaN(parseInt(month)) || isNaN(parseInt(day)) ||
      isNaN(parseInt(hour)) || isNaN(parseInt(minute))) {
    console.error(`formatTargetTimezoneDateTimeLocalToUTCISO: Failed to parse numeric components from dateTimeLocalString='${dateTimeLocalString}'.`);
    return '';
  }
  
  // Return as YYYY-MM-DDTHH:MM:SS (local time)
  // Supabase will interpret this according to its server timezone ('America/Argentina/Buenos_Aires')
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}


/**
 * Gets a Date object whose local parts (year, month, day, hour, etc., when read via getFullYear(), getHours())
 * represent the current wall-clock time in the specified target timezone.
 * @param targetTimezone IANA timezone name
 * @returns Date object.
 */
export function getLocalDateObjectForTargetTimezone(targetTimezone: string): Date {
  const now = new Date(); 
  
  const formatter = new Intl.DateTimeFormat('en-CA', { // Using en-CA for YYYY-MM-DD structure
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: targetTimezone
  });

  const parts = formatter.formatToParts(now);
  
  const yearStr = parts.find(p => p.type === 'year')?.value;
  const monthStr = parts.find(p => p.type === 'month')?.value; // 1-indexed
  const dayStr = parts.find(p => p.type === 'day')?.value;
  let hourStr = parts.find(p => p.type === 'hour')?.value;
  const minuteStr = parts.find(p => p.type === 'minute')?.value;
  const secondStr = parts.find(p => p.type === 'second')?.value;

  if (!yearStr || !monthStr || !dayStr || !hourStr || !minuteStr || !secondStr) {
      console.error("getLocalDateObjectForTargetTimezone: Could not extract all parts from Intl.DateTimeFormat.");
      return new Date(); // Fallback
  }
  
  if (hourStr === '24') hourStr = '00';


  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // month is 1-indexed here
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const second = parseInt(secondStr, 10);

  if ([year, month, day, hour, minute, second].some(isNaN)) {
    console.error("getLocalDateObjectForTargetTimezone: Failed to parse numeric components from Intl parts.");
    return new Date(); // Fallback
  }
  
  return new Date(year, month - 1, day, hour, minute, second);
}