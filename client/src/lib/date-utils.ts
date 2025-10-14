// Default timezone for the application - استخدام توقيت الرياض الثابت
const DEFAULT_TIMEZONE = 'Asia/Riyadh';

export function formatArabicDate(dateInput: Date | string): string {
  if (!dateInput) return 'غير محدد';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'تاريخ غير صحيح';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
    calendar: 'gregory' // استخدام التقويم الميلادي
  };
  
  return date.toLocaleDateString('ar-EG', options); // ar-EG يستخدم التقويم الميلادي
}

export function formatArabicDateTime(date: Date): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
    calendar: 'gregory' // استخدام التقويم الميلادي
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  };
  
  const arabicDate = date.toLocaleDateString('ar-EG', dateOptions);
  const arabicTime = date.toLocaleTimeString('ar-EG', timeOptions);
  
  return `${arabicDate} - ${arabicTime}`;
}

export function formatShortDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
    calendar: 'gregory' // استخدام التقويم الميلادي
  };
  
  return date.toLocaleDateString('ar-EG', options);
}

export function formatTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  };
  
  return date.toLocaleTimeString('ar-EG', options);
}

export function isToday(date: Date): boolean {
  const today = new Date();
  const todayInTimezone = new Date(today.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  return dateInTimezone.toDateString() === todayInTimezone.toDateString();
}

export function isYesterday(date: Date): boolean {
  const today = new Date();
  const todayInTimezone = new Date(today.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  const yesterday = new Date(todayInTimezone);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  return dateInTimezone.toDateString() === yesterday.toDateString();
}

export function getRelativeTimeText(date: Date): string {
  if (isToday(date)) {
    return `اليوم ${formatTime(date)}`;
  } else if (isYesterday(date)) {
    return `أمس ${formatTime(date)}`;
  } else {
    return formatShortDate(date);
  }
}

// Get current date/time in the application timezone
export function getCurrentDateTime(): Date {
  return new Date();
}

// Format date in Gregorian calendar specifically
export function formatGregorianDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: DEFAULT_TIMEZONE,
    calendar: 'gregory'
  };
  
  return date.toLocaleDateString('ar-EG', options);
}

// Format date for input fields (YYYY-MM-DD format)
export function formatForInput(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: DEFAULT_TIMEZONE });
}

// Convert UTC date to local timezone
export function convertToLocalTimezone(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
}

// Get timezone offset for display - استخدام توقيت الجهاز
export function getTimezoneInfo(): string {
  const formatter = new Intl.DateTimeFormat('ar-EG', {
    timeZone: DEFAULT_TIMEZONE,
    timeZoneName: 'long',
    calendar: 'gregory'
  });
  
  const now = new Date();
  const timeZoneInfo = formatter.formatToParts(now).find(part => part.type === 'timeZoneName');
  return timeZoneInfo?.value || `توقيت الجهاز (${DEFAULT_TIMEZONE})`;
}

// Format date for database storage (ISO string in local timezone)
export function formatForDatabase(date: Date = new Date()): string {
  // Convert to local device timezone and then to ISO string
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  return localDate.toISOString();
}

// Parse database date to local timezone
export function parseFromDatabase(isoString: string): Date {
  const date = new Date(isoString);
  return convertToLocalTimezone(date);
}

// إنشاء timestamp صحيح بمنطقة الجهاز الزمنية للتقارير
export function getReportTimestamp(): string {
  const now = new Date();
  // استخدام التوقيت المحلي للجهاز بدلاً من GMT/UTC
  return now.toLocaleString('sv-SE', { timeZone: DEFAULT_TIMEZONE }).replace(' ', 'T') + '.000Z';
}

// حفظ الوقت بالمنطقة الزمنية الصحيحة للجهاز
export function getDeviceLocalTimestamp(): string {
  const now = new Date();
  return now.toLocaleString('sv-SE', { timeZone: DEFAULT_TIMEZONE });
}

// تنسيق التاريخ للتقارير باستخدام التوقيت المحلي
export function formatReportDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: DEFAULT_TIMEZONE });
}

// تنسيق الوقت للتقارير باستخدام التوقيت المحلي
export function formatReportTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('ar-EG', { 
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// تنسيق التاريخ والوقت الكامل للتقارير
export function formatReportDateTime(date: Date = new Date()): string {
  const arabicDate = date.toLocaleDateString('ar-EG', {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric',
    calendar: 'gregory'
  });
  const arabicTime = date.toLocaleTimeString('ar-EG', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${arabicDate} - ${arabicTime}`;
}

// إنشاء اسم ملف تقرير بالتاريخ المحلي
export function generateReportFilename(prefix: string, extension: string = 'xlsx'): string {
  const date = new Date();
  const localDate = date.toLocaleDateString('en-CA', { timeZone: DEFAULT_TIMEZONE });
  const localTime = date.toLocaleTimeString('en-GB', { 
    timeZone: DEFAULT_TIMEZONE,
    hour12: false 
  }).replace(/:/g, '-');
  return `${prefix}_${localDate}_${localTime}.${extension}`;
}
