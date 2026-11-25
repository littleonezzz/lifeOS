import { describe, it, expect } from 'vitest';
import { dailyStats, weeklyStats } from './stats';
import { createInitialData } from './storage';
import type { TaskInstance, InterruptRecord } from '../types';

const DATE = '2026-11-25';

function mk(id: string, cat: TaskInstance['category'], status: TaskInstance['status'], dur = 30, actual?: number): TaskInstance {
  return {
    id, templateId: id, date: DATE, title: id, category: cat,
    priority: cat === 'itai' || cat === 'reading' || cat === 'english' ? 'flexible' : 'protected',
    start: '08:00', durationMin: dur, fixed: false, status,
    actualDurationMin: actual
  };
}

describe('dailyStats', () => {
  it('聚合当日完成、跳过、运动、阅读分钟等', () => {
    const instances = [
      mk('w', 'work', 'done', 180, 180),
      mk('h', 'health', 'done', 60, 60),
      mk('r', 'reading', 'done', 30, 30),
      mk('e', 'english', 'done', 20, 20),
      mk('i', 'itai', 'pending', 50),
      mk('x', 'life', 'skipped', 10)
    ];
    const interrupts: InterruptRecord[] = [
      { id: 'int', date: DATE, category: 'wife-phone', label: '妻子电话', startEpoch: new Date(2026, 10, 25, 20, 10).getTime(), endEpoch: new Date(2026, 10, 25, 20, 40).getTime() }
    ];
    const s = dailyStats(instances, interrupts, undefined);
    expect(s.total).toBe(6);
    expect(s.done).toBe(4);
    expect(s.skipped).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.exerciseCount).toBe(1);
    expect(s.readingMinutes).toBe(30);
    expect(s.englishCount).toBe(1);
    expect(s.itaiMinutes).toBe(0); // itai 未完成
    expect(s.interruptCount).toBe(1);
    expect(s.interruptMinutes).toBe(30);
    expect(s.completionRate).toBeCloseTo(4 / 6);
  });

  it('跨夜睡眠时长计算', () => {
    const s = dailyStats([], [], { date: DATE, bedTime: '23:15', wakeTime: '07:05' });
    expect(s.sleepMinutes).toBe(7 * 60 + 50 - 15 - 15 + 30); // 23:15->07:05 = 470
    expect(s.sleepMinutes).toBe(470);
  });
});

describe('weeklyStats', () => {
  it('跨 7 天聚合，无数据日按 0 计', () => {
    const data = createInitialData();
    const inst = mk('r', 'reading', 'done', 30, 30);
    inst.date = DATE;
    data.instances[inst.id] = inst;
    data.interrupts.push({ id: 'int', date: DATE, category: 'wife-phone', label: '妻子电话', startEpoch: 1, endEpoch: 1000 });
    const w = weeklyStats(data, DATE);
    expect(w.readingMinutes).toBe(30);
    expect(w.readingDays).toBe(1);
    // 该周仅 1 个任务、完成 1 个
    expect(w.total).toBe(1);
    expect(w.done).toBe(1);
    expect(w.completionRate).toBe(1);
  });
});
