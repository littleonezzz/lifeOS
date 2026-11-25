import type { AppData, InterruptRecord, SleepRecord, TaskInstance } from '../types';
import { addDays, minutesBetween, startOfWeek, toMinutes, weekDays } from './time';

export interface DailyStats {
  date: string;
  total: number;
  done: number;
  skipped: number;
  moved: number;
  shortened: number;
  pending: number;
  completionRate: number;
  exerciseCount: number;
  readingMinutes: number;
  englishCount: number;
  itaiMinutes: number;
  interruptCount: number;
  interruptMinutes: number;
  sleepMinutes?: number;
}

function minutesOfDone(inst: TaskInstance): number {
  return inst.actualDurationMin ?? inst.durationMin;
}

export function dailyStats(
  instances: TaskInstance[],
  interrupts: InterruptRecord[],
  sleep: SleepRecord | undefined
): DailyStats {
  const total = instances.length;
  let done = 0,
    skipped = 0,
    moved = 0,
    shortened = 0,
    pending = 0;
  let exerciseCount = 0;
  let readingMinutes = 0;
  let englishCount = 0;
  let itaiMinutes = 0;

  for (const i of instances) {
    switch (i.status) {
      case 'done':
        done++;
        if (i.category === 'health') exerciseCount++;
        if (i.category === 'reading') readingMinutes += minutesOfDone(i);
        if (i.category === 'english') englishCount++;
        if (i.category === 'itai') itaiMinutes += minutesOfDone(i);
        break;
      case 'skipped':
        skipped++;
        break;
      case 'moved':
        moved++;
        if (i.category === 'reading') readingMinutes += minutesOfDone(i);
        if (i.category === 'itai') itaiMinutes += minutesOfDone(i);
        break;
      case 'shortened':
        shortened++;
        break;
      case 'pending':
        pending++;
        break;
    }
  }

  const dayInterrupts = interrupts;
  const interruptMinutes = dayInterrupts.reduce(
    (s, r) => s + (r.endEpoch ? minutesBetween(r.startEpoch, r.endEpoch) : 0),
    0
  );

  let sleepMinutes: number | undefined;
  if (sleep?.bedTime && sleep?.wakeTime) {
    // 跨夜睡眠时长
    let mins = toMinutes(sleep.wakeTime) - toMinutes(sleep.bedTime);
    if (mins < 0) mins += 1440;
    sleepMinutes = mins;
  }

  const completionRate = total > 0 ? done / total : 0;

  return {
    date: instances[0]?.date ?? '',
    total,
    done,
    skipped,
    moved,
    shortened,
    pending,
    completionRate,
    exerciseCount,
    readingMinutes,
    englishCount,
    itaiMinutes,
    interruptCount: dayInterrupts.length,
    interruptMinutes,
    sleepMinutes
  };
}

export interface WeeklyStats {
  weekStart: string;
  days: DailyStats[];
  exerciseCount: number;
  readingMinutes: number;
  englishCount: number;
  itaiMinutes: number;
  done: number;
  total: number;
  completionRate: number;
  interruptMinutes: number;
  readingDays: number;
}

export function weeklyStats(data: AppData, anyDate: string): WeeklyStats {
  const ws = startOfWeek(anyDate);
  const days = weekDays(ws).map((date) => {
    const dayInstances = Object.values(data.instances).filter((i) => i.date === date);
    const dayInterrupts = data.interrupts.filter((r) => r.date === date);
    const sleep = data.sleepRecords[date];
    return dailyStats(dayInstances, dayInterrupts, sleep);
  });

  const sum = (f: (d: DailyStats) => number) => days.reduce((s, d) => s + f(d), 0);
  const total = sum((d) => d.total);
  const done = sum((d) => d.done);

  return {
    weekStart: ws,
    days,
    exerciseCount: sum((d) => d.exerciseCount),
    readingMinutes: sum((d) => d.readingMinutes),
    englishCount: sum((d) => d.englishCount),
    itaiMinutes: sum((d) => d.itaiMinutes),
    done,
    total,
    completionRate: total > 0 ? done / total : 0,
    interruptMinutes: sum((d) => d.interruptMinutes),
    readingDays: days.filter((d) => d.readingMinutes > 0).length
  };
}

/** 最近 n 天的每日完成率（用于趋势条） */
export function recentDailyRates(data: AppData, days: number): Array<{ date: string; rate: number; done: number; total: number }> {
  const today = new Date();
  const out: Array<{ date: string; rate: number; done: number; total: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dStr = addDays(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      -i
    );
    const insts = Object.values(data.instances).filter((x) => x.date === dStr);
    const done = insts.filter((x) => x.status === 'done').length;
    const total = insts.length;
    out.push({ date: dStr, rate: total > 0 ? done / total : 0, done, total });
  }
  return out;
}
