import type { AutomationScheduleValue } from "./types";

function parseTime(value: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Invalid schedule time.");
  }

  return { hour, minute };
}

function nextUtcDateAtTime(fromDate: Date, daysToAdd: number, time: string): Date {
  const { hour, minute } = parseTime(time);
  const next = new Date(fromDate);

  next.setUTCDate(next.getUTCDate() + daysToAdd);
  next.setUTCHours(hour, minute, 0, 0);

  return next;
}

export function calculateNextRunAt(
  schedule: AutomationScheduleValue,
  fromDate: Date = new Date()
): Date {
  if (schedule.type === "once") {
    const runAt = new Date(schedule.runAt);

    if (Number.isNaN(runAt.getTime())) {
      throw new Error("Invalid run once date.");
    }

    return runAt;
  }

  if (schedule.type === "interval") {
    if (!Number.isInteger(schedule.every) || schedule.every <= 0) {
      throw new Error("Invalid interval schedule.");
    }

    const next = new Date(fromDate);

    if (schedule.unit === "minutes") {
      next.setUTCMinutes(next.getUTCMinutes() + schedule.every);
      return next;
    }

    if (schedule.unit === "hours") {
      next.setUTCHours(next.getUTCHours() + schedule.every);
      return next;
    }

    next.setUTCDate(next.getUTCDate() + schedule.every);
    return next;
  }

  if (schedule.type === "daily") {
    let next = nextUtcDateAtTime(fromDate, 0, schedule.time);

    if (next <= fromDate) {
      next = nextUtcDateAtTime(fromDate, 1, schedule.time);
    }

    return next;
  }

  if (schedule.type === "weekly") {
    if (
      !Number.isInteger(schedule.dayOfWeek) ||
      schedule.dayOfWeek < 0 ||
      schedule.dayOfWeek > 6
    ) {
      throw new Error("Invalid weekly day.");
    }

    const currentDay = fromDate.getUTCDay();
    let daysToAdd = (schedule.dayOfWeek - currentDay + 7) % 7;
    let next = nextUtcDateAtTime(fromDate, daysToAdd, schedule.time);

    if (next <= fromDate) {
      daysToAdd += 7;
      next = nextUtcDateAtTime(fromDate, daysToAdd, schedule.time);
    }

    return next;
  }

  if (schedule.type === "monthly") {
    if (
      !Number.isInteger(schedule.dayOfMonth) ||
      schedule.dayOfMonth < 1 ||
      schedule.dayOfMonth > 31
    ) {
      throw new Error("Invalid monthly day.");
    }

    const { hour, minute } = parseTime(schedule.time);
    const next = new Date(fromDate);
    const targetDay = Math.min(schedule.dayOfMonth, 28);

    next.setUTCDate(targetDay);
    next.setUTCHours(hour, minute, 0, 0);

    if (next <= fromDate) {
      next.setUTCMonth(next.getUTCMonth() + 1);
      next.setUTCDate(targetDay);
      next.setUTCHours(hour, minute, 0, 0);
    }

    return next;
  }

  throw new Error("Unsupported schedule type.");
}
