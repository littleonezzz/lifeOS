import { describe, it, expect } from 'vitest';
import { detectAffected, applyAdjustments } from './interrupt';
import { INTERRUPT_LABELS } from '../data/defaultTemplates';
import { DEFAULT_SETTINGS } from '../data/defaultSettings';
import type { InterruptRecord, TaskInstance } from '../types';
import { toMinutes } from './time';

const settings = DEFAULT_SETTINGS;
const DATE = '2026-11-25';
const epoch = (h: number, m: number) => new Date(2026, 10, 25, h, m).getTime();

function mkInst(partial: Partial<TaskInstance> & { id: string; start: string; durationMin: number; category: TaskInstance['category'] }): TaskInstance {
  return {
    templateId: partial.id,
    date: DATE,
    title: partial.id,
    priority: partial.priority ?? (partial.category === 'itai' || partial.category === 'reading' ? 'flexible' : 'protected'),
    fixed: partial.fixed ?? false,
    status: 'pending',
    ...partial
  } as TaskInstance;
}

describe('detectAffected · 可移动学习任务', () => {
  it('妻子电话打断 IT/AI 学习 → 推荐移动到中断后的弹性时段', () => {
    const instances = [
      mkInst({ id: 'itai', start: '20:00', durationMin: 50, category: 'itai', lowEnergyMin: 15 }),
      mkInst({ id: 'reading', start: '20:50', durationMin: 30, category: 'reading', lowEnergyMin: 5 }),
      mkInst({ id: 'wife', start: '21:20', durationMin: 60, category: 'family', fixed: false }),
      mkInst({ id: 'prep', start: '22:20', durationMin: 40, category: 'life', fixed: true }),
      mkInst({ id: 'sleep', start: '23:00', durationMin: 480, category: 'sleep', fixed: true })
    ];
    const rec: InterruptRecord = {
      id: 'i1', date: DATE, category: 'wife-phone', label: '妻子电话', startEpoch: epoch(20, 10), endEpoch: epoch(20, 40)
    };
    const affected = detectAffected(instances, rec, settings, rec.endEpoch!);
    expect(affected).toHaveLength(1);
    const a = affected[0];
    expect(a.instance.id).toBe('itai');
    expect(a.overlapMin).toBe(30);
    expect(a.recommendation).toBe('move');
    expect(a.moveTarget).toBe(toMinutes('20:40'));
    expect(a.moveIsShortened).toBe(false);
    // 妻子电话为中性事件，文案不含失败/惩罚
    expect(a.reason).not.toMatch(/失败|惩罚/);
  });

  it('中断后剩余时间不足以安排 → 推荐跳过，不熬夜', () => {
    const instances = [
      mkInst({ id: 'flex', start: '21:30', durationMin: 45, category: 'itai', lowEnergyMin: 15 }),
      mkInst({ id: 'prep', start: '22:20', durationMin: 40, category: 'life', fixed: true }),
      mkInst({ id: 'sleep', start: '23:00', durationMin: 480, category: 'sleep', fixed: true })
    ];
    const rec: InterruptRecord = {
      id: 'i2', date: DATE, category: 'temp-work', label: '临时工作', startEpoch: epoch(21, 30), endEpoch: epoch(22, 18)
    };
    const affected = detectAffected(instances, rec, settings, rec.endEpoch!);
    const flex = affected.find((a) => a.instance.id === 'flex')!;
    expect(flex).toBeTruthy();
    expect(flex.recommendation).toBe('skip');
    expect(flex.reason).toContain('不熬夜');
  });
});

describe('detectAffected · 受保护任务', () => {
  it('固定工作被打断 → 推荐继续完成剩余', () => {
    const instances = [
      mkInst({ id: 'work', start: '08:30', durationMin: 180, category: 'work', fixed: true })
    ];
    const rec: InterruptRecord = {
      id: 'i3', date: DATE, category: 'other', label: '其他', startEpoch: epoch(9, 0), endEpoch: epoch(9, 20)
    };
    const a = detectAffected(instances, rec, settings, rec.endEpoch!)[0];
    expect(a.recommendation).toBe('continue');
    expect(a.options).toContain('shorten');
    expect(a.options).toContain('skip');
  });

  it('睡眠任务被打断 → 只能继续，绝不压缩或移动', () => {
    const instances = [mkInst({ id: 'sleep', start: '23:00', durationMin: 480, category: 'sleep', fixed: true })];
    const rec: InterruptRecord = {
      id: 'i4', date: DATE, category: 'wife-phone', label: '妻子电话', startEpoch: epoch(23, 10), endEpoch: epoch(23, 40)
    };
    const a = detectAffected(instances, rec, settings, rec.endEpoch!)[0];
    expect(a.recommendation).toBe('continue');
    expect(a.options).toEqual(['continue']);
  });
});

describe('applyAdjustments · 应用用户确认的调整', () => {
  const base = {
    itai: mkInst({ id: 'itai', start: '20:00', durationMin: 50, category: 'itai', lowEnergyMin: 15 }),
    sleep: mkInst({ id: 'sleep', start: '23:00', durationMin: 480, category: 'sleep', fixed: true })
  };
  const rec: InterruptRecord = {
    id: 'i', date: DATE, category: 'wife-phone', label: '妻子电话', startEpoch: epoch(20, 10), endEpoch: epoch(20, 40)
  };

  it('continue 保持待办', () => {
    const map = { [base.itai.id]: base.itai };
    const out = applyAdjustments(map, [{ instanceId: base.itai.id, action: 'continue' }], rec, settings);
    expect(out[base.itai.id].status).toBe('pending');
  });

  it('shorten 缩短为低能量版本', () => {
    const map = { [base.itai.id]: base.itai };
    const out = applyAdjustments(map, [{ instanceId: base.itai.id, action: 'shorten', newDurationMin: 15, isLowEnergy: true }], rec, settings);
    expect(out[base.itai.id].durationMin).toBe(15);
    expect(out[base.itai.id].isLowEnergy).toBe(true);
    expect(out[base.itai.id].originalDurationMin).toBe(50);
  });

  it('move 合法目标 → 改时间并记录原时间', () => {
    const map = { [base.itai.id]: base.itai };
    const out = applyAdjustments(map, [{ instanceId: base.itai.id, action: 'move', newStart: '20:40', newDurationMin: 50 }], rec, settings);
    expect(out[base.itai.id].start).toBe('20:40');
    expect(out[base.itai.id].originalStart).toBe('20:00');
    expect(out[base.itai.id].status).toBe('pending');
  });

  it('move 目标侵入睡眠 → 退化为跳过（睡眠保护）', () => {
    const map = { [base.itai.id]: base.itai };
    const out = applyAdjustments(map, [{ instanceId: base.itai.id, action: 'move', newStart: '23:30', newDurationMin: 50 }], rec, settings);
    expect(out[base.itai.id].status).toBe('skipped');
    expect(out[base.itai.id].note).toContain('睡眠');
  });

  it('skip → 标记跳过，不计失败', () => {
    const map = { [base.itai.id]: base.itai };
    const out = applyAdjustments(map, [{ instanceId: base.itai.id, action: 'skip' }], rec, settings);
    expect(out[base.itai.id].status).toBe('skipped');
    expect(out[base.itai.id].note).toContain('不计入失败');
  });
});

describe('妻子电话中性文案', () => {
  it('标签为中性“妻子电话”', () => {
    expect(INTERRUPT_LABELS['wife-phone'].label).toBe('妻子电话');
  });
  it('所有中断类型文案不含失败/惩罚/红色警告', () => {
    for (const key of Object.keys(INTERRUPT_LABELS)) {
      const label = INTERRUPT_LABELS[key].label;
      expect(label).not.toMatch(/失败|惩罚|警告|红色/);
    }
  });
});
