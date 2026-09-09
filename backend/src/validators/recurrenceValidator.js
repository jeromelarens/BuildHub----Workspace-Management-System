/**
 * Task Recurrence Input Validation
 */

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'custom'];
const ALLOWED_RECURRENCE_FIELDS = [
  'frequency',
  'interval_count',
  'day_of_week',
  'day_of_month',
  'next_run_date',
  'end_date',
  'is_active',
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (dateStr) => {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
};

const validateRecurrenceBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
    };
  }

  const errors = {};
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!ALLOWED_RECURRENCE_FIELDS.includes(key)) {
      errors[key] = `Unexpected field '${key}' is not allowed`;
    }
  }

  const {
    frequency,
    interval_count,
    day_of_week,
    day_of_month,
    next_run_date,
    end_date,
    is_active,
  } = body;

  // Validate frequency
  let cleanFrequency = 'daily';
  if (frequency === undefined || frequency === null) {
    errors.frequency = 'Frequency is required';
  } else if (typeof frequency !== 'string') {
    errors.frequency = 'Frequency must be a string';
  } else {
    const lowerFreq = frequency.trim().toLowerCase();
    if (!VALID_FREQUENCIES.includes(lowerFreq)) {
      errors.frequency = `Invalid frequency. Allowed values: ${VALID_FREQUENCIES.join(', ')}`;
    } else {
      cleanFrequency = lowerFreq;
    }
  }

  // Validate interval_count (optional, default 1)
  let cleanInterval = 1;
  if (interval_count !== undefined && interval_count !== null) {
    const parsedInterval = parseInt(interval_count, 10);
    if (isNaN(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      errors.interval_count = 'interval_count must be a positive integer between 1 and 365';
    } else {
      cleanInterval = parsedInterval;
    }
  }

  // Validate day_of_week (0-6)
  let cleanDayOfWeek = null;
  if (day_of_week !== undefined && day_of_week !== null) {
    const parsedDay = parseInt(day_of_week, 10);
    if (isNaN(parsedDay) || parsedDay < 0 || parsedDay > 6) {
      errors.day_of_week = 'day_of_week must be an integer between 0 (Sunday) and 6 (Saturday)';
    } else {
      cleanDayOfWeek = parsedDay;
    }
  }

  // Validate day_of_month (1-31)
  let cleanDayOfMonth = null;
  if (day_of_month !== undefined && day_of_month !== null) {
    const parsedDom = parseInt(day_of_month, 10);
    if (isNaN(parsedDom) || parsedDom < 1 || parsedDom > 31) {
      errors.day_of_month = 'day_of_month must be an integer between 1 and 31';
    } else {
      cleanDayOfMonth = parsedDom;
    }
  }

  // Validate next_run_date (optional)
  let cleanNextRunDate = null;
  if (next_run_date !== undefined && next_run_date !== null) {
    if (typeof next_run_date !== 'string' || !isValidIsoDate(next_run_date.trim())) {
      errors.next_run_date = 'next_run_date must be a valid date in YYYY-MM-DD format';
    } else {
      cleanNextRunDate = next_run_date.trim();
    }
  }

  // Validate end_date (optional)
  let cleanEndDate = null;
  if (end_date !== undefined && end_date !== null) {
    if (typeof end_date !== 'string' || !isValidIsoDate(end_date.trim())) {
      errors.end_date = 'end_date must be a valid date in YYYY-MM-DD format';
    } else {
      cleanEndDate = end_date.trim();
    }
  }

  // Validate is_active (optional, default true)
  let cleanIsActive = true;
  if (is_active !== undefined && is_active !== null) {
    if (typeof is_active !== 'boolean') {
      errors.is_active = 'is_active must be a boolean';
    } else {
      cleanIsActive = is_active;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    normalizedData: {
      frequency: cleanFrequency,
      intervalCount: cleanInterval,
      dayOfWeek: cleanDayOfWeek,
      dayOfMonth: cleanDayOfMonth,
      nextRunDate: cleanNextRunDate,
      endDate: cleanEndDate,
      isActive: cleanIsActive,
    },
  };
};

module.exports = {
  VALID_FREQUENCIES,
  validateRecurrenceBody,
};
