import type { AppData, Settings, TaskTemplate } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaultSettings';
import { buildDefaultTemplates } from '../data/defaultTemplates';

export const STORAGE_KEY = 'lifeos:data:v1';
export const DATA_VERSION = 1;

export function createInitialData(): AppData {
  return {
    version: DATA_VERSION,
    templates: buildDefaultTemplates(),
    instances: {},
    interrupts: [],
    sleepRecords: {},
    reviews: {},
    settings: { ...DEFAULT_SETTINGS },
    activeInterrupt: undefined,
    restDays: [],
    lowEnergyDays: [],
    createdAt: Date.now()
  };
}

/** 深合并：用默认值补齐缺失的设置字段（兼容旧导出） */
function normalizeSettings(input: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(input ?? {}), lowEnergy: { ...DEFAULT_SETTINGS.lowEnergy, ...(input?.lowEnergy ?? {}) } };
}

function normalizeTemplates(input: unknown): TaskTemplate[] {
  if (!Array.isArray(input)) return buildDefaultTemplates();
  return input
    .filter((t) => t && typeof t === 'object' && typeof (t as TaskTemplate).id === 'string')
    .map((t) => t as TaskTemplate);
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialData();
    return parseData(raw);
  } catch {
    return createInitialData();
  }
}

export function parseData(raw: string): AppData {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new Error('文件不是有效的 JSON。');
  }
  if (!obj || typeof obj !== 'object') throw new Error('文件内容不是合法的数据对象。');
  const o = obj as Partial<AppData>;
  if (!Array.isArray(o.templates)) throw new Error('缺少任务模板数据，无法导入。');
  if (!o.settings) throw new Error('缺少设置数据，无法导入。');

  const data = createInitialData();
  data.templates = normalizeTemplates(o.templates);
  data.instances = o.instances && typeof o.instances === 'object' ? (o.instances as AppData['instances']) : {};
  data.interrupts = Array.isArray(o.interrupts) ? o.interrupts : [];
  data.sleepRecords = o.sleepRecords && typeof o.sleepRecords === 'object' ? (o.sleepRecords as AppData['sleepRecords']) : {};
  data.reviews = o.reviews && typeof o.reviews === 'object' ? (o.reviews as AppData['reviews']) : {};
  data.settings = normalizeSettings(o.settings);
  data.activeInterrupt = o.activeInterrupt;
  data.restDays = Array.isArray(o.restDays) ? o.restDays : [];
  data.lowEnergyDays = Array.isArray(o.lowEnergyDays) ? o.lowEnergyDays : [];
  data.createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now();
  return data;
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // 容量超限等情况：抛出供 UI 提示
    throw new Error('本地存储失败，可能空间不足：' + (e instanceof Error ? e.message : String(e)));
  }
}

export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function buildExportFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `LifeOS-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}
