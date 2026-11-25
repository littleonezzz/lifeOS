import type { Adjustment, AffectedTask, InterruptRecord, Settings, TaskInstance } from '../types';
import {
  epochToLocalMinutes,
  findFreeGap,
  minutesBetween,
  nowEpoch,
  overlapsSleep,
  overlapMin,
  splitInterval,
  toHHMM,
  toMinutes
} from './time';

/** 进行中中断的当前结束分钟（用于实时显示，未结束时） */
export function interruptEndMin(rec: InterruptRecord, now = nowEpoch()): number {
  return epochToLocalMinutes(rec.endEpoch ?? now);
}

export function interruptDurationMin(rec: InterruptRecord, now = nowEpoch()): number {
  return minutesBetween(rec.startEpoch, rec.endEpoch ?? now);
}

/** 一天里“不可移动”的忙碌区间：受保护且固定的任务（睡眠/工作/正餐/通勤/固定训练） */
export function immovableBusy(instances: TaskInstance[]): Array<[number, number]> {
  return instances
    .filter((i) => i.priority === 'protected' && i.fixed && i.status !== 'skipped')
    .flatMap((i) => splitInterval(toMinutes(i.start), i.durationMin));
}

/** 为一个可移动任务寻找今天的空隙起点（分钟），不含睡眠区间 */
export function findMoveTarget(
  durationMin: number,
  afterMin: number,
  instances: TaskInstance[],
  settings: Settings
): number | null {
  return findFreeGap(afterMin, durationMin, immovableBusy(instances), settings.wakeTarget, settings.sleepTarget);
}

/** 计算某任务在受影响后的“原时段剩余可做分钟” */
function remainingInPlace(taskStartMin: number, taskDur: number, interruptEnd: number): number {
  const taskEnd = taskStartMin + taskDur; // 不考虑跨午夜的普通任务
  return Math.max(0, Math.min(taskEnd, 1440) - interruptEnd);
}

/** 检测中断影响的任务并给出建议 */
export function detectAffected(
  instances: TaskInstance[],
  interrupt: InterruptRecord,
  settings: Settings,
  now = nowEpoch()
): AffectedTask[] {
  const startMin = epochToLocalMinutes(interrupt.startEpoch);
  const endMin = interruptEndMin(interrupt, now);
  const durMin = interruptDurationMin(interrupt, now);

  const result: AffectedTask[] = [];

  for (const inst of instances) {
    if (inst.status === 'done' || inst.status === 'skipped') continue;
    const taskStart = toMinutes(inst.start);
    const overlap = overlapMin(taskStart, inst.durationMin, startMin, durMin);
    if (overlap <= 0) continue;

    result.push(recommendForTask(inst, overlap, endMin, instances, settings));
  }

  // 按时间排序
  result.sort((a, b) => toMinutes(a.instance.start) - toMinutes(b.instance.start));
  return result;
}

function recommendForTask(
  inst: TaskInstance,
  overlap: number,
  interruptEnd: number,
  instances: TaskInstance[],
  settings: Settings
): AffectedTask {
  const taskStart = toMinutes(inst.start);
  const remaining = remainingInPlace(taskStart, inst.durationMin, interruptEnd);
  const flexible = inst.priority === 'flexible';

  // —— 受保护任务（睡眠/工作/健康/家庭/生活固定项）：不移动 ——
  if (!flexible) {
    const options: Array<AffectedTask['recommendation']> = [];
    if (inst.category === 'sleep') {
      // 睡眠绝不被压缩或移动
      return {
        instance: inst,
        overlapMin: overlap,
        recommendation: 'continue',
        options: ['continue'],
        reason: '睡眠受保护，按计划休息，不因中断压缩。'
      };
    }
    if (remaining > 0) {
      options.push('continue', 'shorten', 'skip');
      return {
        instance: inst,
        overlapMin: overlap,
        recommendation: 'continue',
        options,
        shortenDurationMin: Math.min(remaining, inst.durationMin),
        reason: `原时段还剩 ${remaining} 分钟，可继续完成剩余部分。`
      };
    }
    return {
      instance: inst,
      overlapMin: overlap,
      recommendation: 'skip',
      options: ['skip'],
      reason: '该时段已被中断占满，建议跳过，不挪入睡眠时间。'
    };
  }

  // —— 可移动学习任务：尝试在睡眠保护内寻找去处 ——
  const fallbackLow = settings.lowEnergy[categoryToLowKey(inst.category)] ?? Math.round(inst.durationMin / 3);
  const lowEnergyDur = inst.isLowEnergy ? inst.durationMin : inst.lowEnergyMin ?? fallbackLow;
  const fullGap = findMoveTarget(inst.durationMin, interruptEnd, instances, settings);
  const lowGap = findMoveTarget(lowEnergyDur, interruptEnd, instances, settings);

  const options: Array<AffectedTask['recommendation']> = ['skip'];
  if (remaining > 0) options.push('continue');
  if (lowEnergyDur < inst.durationMin) options.push('shorten');
  if (fullGap !== null || lowGap !== null) options.push('move');

  // 推荐顺序：完整移动 > 原地缩短 > 移动并缩短 > 跳过
  if (fullGap !== null) {
    return {
      instance: inst,
      overlapMin: overlap,
      recommendation: 'move',
      options,
      moveTarget: fullGap,
      moveTargetLowEnergy: lowGap ?? undefined,
      moveIsShortened: false,
      shortenDurationMin: lowEnergyDur,
      reason: `可移至 ${toHHMM(fullGap)} 的弹性时段，完整完成，不影响睡眠。`
    };
  }
  if (remaining >= lowEnergyDur) {
    return {
      instance: inst,
      overlapMin: overlap,
      recommendation: 'shorten',
      options,
      shortenDurationMin: lowEnergyDur,
      reason: `原时段还剩 ${remaining} 分钟，可缩短为 ${lowEnergyDur} 分钟最低版本完成。`
    };
  }
  if (lowGap !== null) {
    return {
      instance: inst,
      overlapMin: overlap,
      recommendation: 'move',
      options,
      moveTarget: lowGap,
      moveIsShortened: true,
      shortenDurationMin: lowEnergyDur,
      reason: `完整时长无处安放，可缩短为 ${lowEnergyDur} 分钟并移至 ${toHHMM(lowGap)}，不熬夜。`
    };
  }
  return {
    instance: inst,
    overlapMin: overlap,
    recommendation: 'skip',
    options,
    shortenDurationMin: lowEnergyDur,
    reason: '今日已无不含睡眠的空余时间，建议跳过，不熬夜补。'
  };
}

function categoryToLowKey(cat: TaskInstance['category']): 'reading' | 'itai' | 'english' | 'exercise' {
  if (cat === 'reading') return 'reading';
  if (cat === 'itai') return 'itai';
  if (cat === 'english') return 'english';
  return 'exercise';
}

/** 应用用户确认的调整，返回更新后的实例集合（不可变） */
export function applyAdjustments(
  instancesMap: Record<string, TaskInstance>,
  adjustments: Adjustment[],
  interrupt: InterruptRecord,
  settings: Settings
): Record<string, TaskInstance> {
  const next = { ...instancesMap };
  const endMin = interruptEndMin(interrupt, interrupt.endEpoch ?? nowEpoch());

  for (const adj of adjustments) {
    const inst = next[adj.instanceId];
    if (!inst) continue;
    const updated: TaskInstance = { ...inst };

    switch (adj.action) {
      case 'continue':
        // 保持原计划；若原起点已在中断内，则从中断结束开始
        if (toMinutes(updated.start) < endMin) {
          updated.start = toHHMM(endMin);
        }
        updated.status = 'pending';
        updated.note = (updated.note ? updated.note + ' ' : '') + '中断后继续。';
        break;

      case 'shorten': {
        const newDur = adj.newDurationMin ?? updated.durationMin;
        updated.originalDurationMin = updated.originalDurationMin ?? updated.durationMin;
        updated.durationMin = newDur;
        updated.isLowEnergy = adj.isLowEnergy ?? updated.isLowEnergy;
        if (toMinutes(updated.start) < endMin) updated.start = toHHMM(endMin);
        updated.status = 'pending';
        updated.note = (updated.note ? updated.note + ' ' : '') + `因中断缩短为 ${newDur} 分钟。`;
        break;
      }

      case 'move': {
        const target = adj.newStart ? toMinutes(adj.newStart) : undefined;
        const newDur = adj.newDurationMin ?? updated.durationMin;
        if (target === undefined) {
          // 无目标则退化为跳过（防御）
          updated.status = 'skipped';
          updated.note = (updated.note ? updated.note + ' ' : '') + '无处可移，已跳过。';
          break;
        }
        // 睡眠保护：移动后不得侵入睡眠
        if (overlapsSleep(target, newDur, settings.sleepTarget, settings.wakeTarget)) {
          updated.status = 'skipped';
          updated.note = (updated.note ? updated.note + ' ' : '') + '移动会侵入睡眠，已跳过。';
          break;
        }
        updated.originalStart = updated.originalStart ?? updated.start;
        updated.originalDurationMin = updated.originalDurationMin ?? updated.durationMin;
        updated.start = toHHMM(target);
        updated.durationMin = newDur;
        updated.isLowEnergy = adj.isLowEnergy ?? (newDur < (updated.originalDurationMin ?? newDur));
        updated.status = 'pending';
        updated.note =
          (updated.note ? updated.note + ' ' : '') +
          `因中断由 ${updated.originalStart} 移至 ${updated.start}。`;
        break;
      }

      case 'skip':
        updated.status = 'skipped';
        updated.note = (updated.note ? updated.note + ' ' : '') + '因中断跳过，不计入失败。';
        break;
    }

    next[adj.instanceId] = updated;
  }

  return next;
}

/** 由受影响任务和建议生成默认调整集合（用户可在面板里改） */
export function buildDefaultAdjustments(affected: AffectedTask[]): Adjustment[] {
  return affected.map((a) => {
    const base: Adjustment = {
      instanceId: a.instance.id,
      action: a.recommendation
    };
    if (a.recommendation === 'move' && a.moveTarget !== undefined) {
      base.newStart = toHHMM(a.moveTarget);
      // 若推荐的是缩短+移动（无完整缝隙），用缩短时长
      const shortened = a.moveTargetLowEnergy === undefined && a.shortenDurationMin && a.shortenDurationMin < a.instance.durationMin;
      if (shortened) {
        base.newDurationMin = a.shortenDurationMin;
        base.isLowEnergy = true;
      }
    }
    if (a.recommendation === 'shorten' && a.shortenDurationMin !== undefined) {
      base.newDurationMin = a.shortenDurationMin;
      base.isLowEnergy = true;
    }
    base.reason = a.reason;
    return base;
  });
}
