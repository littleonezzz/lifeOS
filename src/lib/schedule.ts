import type { Settings, TaskInstance, TaskTemplate } from '../types';
import { toMinutes, weekday } from './time';

/** 模板在该日期是否生效 */
export function templateMatchesDate(t: TaskTemplate, dateStr: string): boolean {
  if (!t.enabled) return false;
  if (t.repeat.type === 'daily') return true;
  const days = t.repeat.days ?? [];
  return days.includes(weekday(dateStr));
}

/** 分类是否属于可被休息日跳过的“工作/训练/学习” */
export function isRestSkippable(category: TaskTemplate['category']): boolean {
  return category === 'work' || category === 'health' || category === 'itai' || category === 'english' || category === 'reading';
}

/** 为某天从模板生成任务实例（幂等：只返回该天应有的实例，不关心是否已存在） */
export function buildInstancesForDate(
  templates: TaskTemplate[],
  dateStr: string,
  _settings: Settings,
  options: { restDay?: boolean; lowEnergyDay?: boolean } = {}
): TaskInstance[] {
  const restDay = options.restDay ?? false;
  const lowEnergyDay = options.lowEnergyDay ?? false;
  const out: TaskInstance[] = [];

  for (const t of templates) {
    if (!templateMatchesDate(t, dateStr)) continue;
    if (restDay && isRestSkippable(t.category)) continue;

    let durationMin = t.durationMin;
    let isLowEnergy = false;
    if (lowEnergyDay && t.lowEnergy) {
      durationMin = t.lowEnergy.durationMin;
      isLowEnergy = true;
    }

    out.push({
      id: `${t.id}__${dateStr}`,
      templateId: t.id,
      date: dateStr,
      title: t.title,
      category: t.category,
      priority: t.priority,
      start: t.start,
      durationMin,
      fixed: t.fixed,
      status: 'pending',
      isLowEnergy,
      lowEnergyMin: t.lowEnergy?.durationMin,
      note: t.note
    });
  }

  out.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  return out;
}

/** 取某天已存在的实例（按时间排序） */
export function getInstancesForDate(instances: Record<string, TaskInstance>, dateStr: string): TaskInstance[] {
  return Object.values(instances)
    .filter((i) => i.date === dateStr)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** 对一天应用低能量版本（就地修改副本） */
export function applyLowEnergyToInstances(list: TaskInstance[]): TaskInstance[] {
  return list.map((i) => ({
    ...i,
    isLowEnergy: true,
    originalDurationMin: i.originalDurationMin ?? i.durationMin
  }));
}
