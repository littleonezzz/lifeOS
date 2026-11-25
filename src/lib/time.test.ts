import { describe, it, expect } from 'vitest';
import {
  toMinutes,
  toHHMM,
  splitInterval,
  overlapMin,
  overlapsSleep,
  findFreeGap,
  addDays,
  startOfWeek,
  weekday
} from './time';

describe('time 基础', () => {
  it('toMinutes / toHHMM 往返', () => {
    expect(toMinutes('23:00')).toBe(1380);
    expect(toMinutes('07:00')).toBe(420);
    expect(toHHMM(1380)).toBe('23:00');
    expect(toHHMM(1500)).toBe('01:00'); // 跨午夜回绕
  });

  it('splitInterval 拆分跨午夜区间', () => {
    expect(splitInterval(1380, 480)).toEqual([
      [1380, 1440],
      [0, 420]
    ]);
    expect(splitInterval(420, 60)).toEqual([[420, 480]]);
  });

  it('overlapMin 计算跨午夜重叠', () => {
    // 睡眠 23:00-07:00 vs 22:50-23:20 → 重叠 20 分钟
    expect(overlapMin(1380, 480, 1370, 30)).toBe(20);
    // 不重叠
    expect(overlapMin(1320, 40, 1380, 480)).toBe(0);
  });
});

describe('睡眠保护', () => {
  it('侵入睡眠窗口的任务返回 true', () => {
    expect(overlapsSleep(1380, 60, '23:00', '07:00')).toBe(true); // 23:00-00:00
    expect(overlapsSleep(1320, 40, '23:00', '07:00')).toBe(false); // 22:00-22:40
  });

  it('findFreeGap 在忙碌间隙中找空隙', () => {
    // 20:40 之后、22:20 之前有 100 分钟空隙
    expect(findFreeGap(1240, 50, [[1340, 1380]], '07:00', '23:00')).toBe(1240);
    // 无足够空隙
    expect(findFreeGap(1240, 50, [[1245, 1380]], '07:00', '23:00')).toBeNull();
  });
});

describe('日期', () => {
  it('2026-11-25 是周三', () => {
    expect(weekday('2026-11-25')).toBe(3);
  });
  it('startOfWeek 回到周一', () => {
    expect(startOfWeek('2026-11-25')).toBe('2026-11-23');
  });
  it('addDays', () => {
    expect(addDays('2026-11-25', 1)).toBe('2026-11-26');
    expect(addDays('2026-11-25', -2)).toBe('2026-11-23');
  });
});
