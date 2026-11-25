import { describe, it, expect } from 'vitest';
import { buildInstancesForDate, templateMatchesDate, isRestSkippable } from './schedule';
import { buildDefaultTemplates } from '../data/defaultTemplates';
import { DEFAULT_SETTINGS } from '../data/defaultSettings';
import type { TaskTemplate } from '../types';

const settings = DEFAULT_SETTINGS;

describe('templateMatchesDate', () => {
  it('每天模板任意日期生效', () => {
    const t: TaskTemplate = { id: 'x', title: 't', category: 'life', priority: 'protected', start: '07:00', durationMin: 40, repeat: { type: 'daily' }, fixed: true, enabled: true };
    expect(templateMatchesDate(t, '2026-11-25')).toBe(true);
  });
  it('工作日模板在周三生效、周末不生效', () => {
    const t: TaskTemplate = { id: 'x', title: 't', category: 'work', priority: 'protected', start: '08:30', durationMin: 180, repeat: { type: 'weekly', days: [1, 2, 3, 4, 5] }, fixed: true, enabled: true };
    expect(templateMatchesDate(t, '2026-11-25')).toBe(true); // 周三
    expect(templateMatchesDate(t, '2026-11-28')).toBe(false); // 周六
  });
  it('停用模板不生效', () => {
    const t: TaskTemplate = { id: 'x', title: 't', category: 'life', priority: 'protected', start: '07:00', durationMin: 40, repeat: { type: 'daily' }, fixed: true, enabled: false };
    expect(templateMatchesDate(t, '2026-11-25')).toBe(false);
  });
});

describe('buildInstancesForDate', () => {
  const date = '2026-11-25'; // 周三

  it('按星期生成正确的训练与晚间学习', () => {
    const list = buildInstancesForDate(buildDefaultTemplates(), date, settings);
    const train = list.find((i) => i.category === 'health' && i.start === '17:00');
    expect(train?.title).toContain('下肢');
    const learn = list.find((i) => i.category === 'itai' && i.start === '20:00');
    expect(learn).toBeTruthy();
  });

  it('休息日跳过工作/训练/学习，保留睡眠与正餐', () => {
    const list = buildInstancesForDate(buildDefaultTemplates(), date, settings, { restDay: true });
    expect(list.find((i) => i.category === 'work')).toBeUndefined();
    expect(list.find((i) => i.category === 'health')).toBeUndefined();
    expect(list.find((i) => i.category === 'itai')).toBeUndefined();
    expect(list.find((i) => i.category === 'sleep')).toBeTruthy();
    expect(list.find((i) => i.category === 'life')).toBeTruthy();
  });

  it('低能量日把可学习任务缩短为最低版本', () => {
    const list = buildInstancesForDate(buildDefaultTemplates(), date, settings, { lowEnergyDay: true });
    const itai = list.find((i) => i.category === 'itai' && i.start === '20:00');
    expect(itai?.isLowEnergy).toBe(true);
    expect(itai?.durationMin).toBe(15);
    expect(itai?.lowEnergyMin).toBe(15);
  });

  it('isRestSkippable 判定', () => {
    expect(isRestSkippable('work')).toBe(true);
    expect(isRestSkippable('health')).toBe(true);
    expect(isRestSkippable('sleep')).toBe(false);
    expect(isRestSkippable('life')).toBe(false);
  });
});
