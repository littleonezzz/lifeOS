// LifeOS 数据模型

export type Category =
  | 'sleep'
  | 'work'
  | 'health'
  | 'family'
  | 'reading'
  | 'english'
  | 'itai'
  | 'life'
  | 'other';

/** protected = 睡眠/工作/健康/家庭（受保护，不轻易移动）；flexible = 学习类（可缩短/移动/跳过） */
export type Priority = 'protected' | 'flexible';

export type TaskStatus = 'pending' | 'done' | 'skipped' | 'moved' | 'shortened';

export type RepeatType = 'daily' | 'weekly';

export interface RepeatRule {
  type: RepeatType;
  /** weekly 时生效：0=周日 … 6=周六 */
  days?: number[];
}

export interface LowEnergyOverride {
  durationMin: number;
  label?: string;
}

/** 计划模板：作息的“源” */
export interface TaskTemplate {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  /** "HH:MM" 本地时间 */
  start: string;
  durationMin: number;
  repeat: RepeatRule;
  /** 固定时段任务（工作/正餐/睡眠等），中断时不移动，只能继续或缩短 */
  fixed: boolean;
  lowEnergy?: LowEnergyOverride;
  note?: string;
  enabled: boolean;
}

/** 某天的任务实例 */
export interface TaskInstance {
  id: string; // `${templateId}__${date}`
  templateId: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: Category;
  priority: Priority;
  start: string; // HH:MM（中断后可能被移动）
  durationMin: number; // 计划分钟数（缩短后可能变小）
  fixed: boolean;
  status: TaskStatus;
  actualDurationMin?: number;
  isLowEnergy?: boolean;
  note?: string;
  /** 该任务模板定义的低能量版本时长（分钟），供中断缩短建议使用 */
  lowEnergyMin?: number;
  /** 若被移动，记录原时间 */
  originalStart?: string;
  originalDurationMin?: number;
}

export type InterruptCategory = 'wife-phone' | 'family' | 'temp-work' | 'other';

export interface InterruptRecord {
  id: string;
  date: string; // YYYY-MM-DD（开始时所属的本地日期）
  category: InterruptCategory;
  label: string;
  startEpoch: number; // ms
  endEpoch?: number;
  durationMin?: number;
  note?: string;
}

export interface SleepRecord {
  date: string; // 当晚就寝日期
  bedTime?: string; // HH:MM 实际就寝
  wakeTime?: string; // HH:MM 次日起床
  note?: string;
}

export interface WeekReview {
  weekStart: string; // 周一日期 YYYY-MM-DD
  goodThings: string;
  blockers: string;
  improveOne: string;
  updatedAt: number;
}

export interface Settings {
  wakeTarget: string; // 07:00
  sleepTarget: string; // 23:00
  sleepPrepStart: string; // 22:20
  workStart: string; // 08:30
  workEnd: string; // 17:00
  lunchStart: string; // 11:30
  lunchEnd: string; // 13:30
  commuteMin: number;
  gymCommuteMin: number;
  readingFreqPerWeek: number;
  englishFreqPerWeek: number;
  itaiFreqPerWeek: number;
  lowEnergy: {
    reading: number;
    itai: number;
    english: number;
    exercise: number;
  };
  theme: 'system' | 'light' | 'dark';
}

export interface AppData {
  version: number;
  templates: TaskTemplate[];
  instances: Record<string, TaskInstance>;
  interrupts: InterruptRecord[];
  sleepRecords: Record<string, SleepRecord>;
  reviews: Record<string, WeekReview>;
  settings: Settings;
  /** 进行中的中断（刷新不丢失） */
  activeInterrupt?: InterruptRecord;
  restDays: string[];
  lowEnergyDays: string[];
  createdAt: number;
}

export type AdjustmentAction = 'continue' | 'shorten' | 'move' | 'skip';

export interface Adjustment {
  instanceId: string;
  action: AdjustmentAction;
  newStart?: string;
  newDurationMin?: number;
  isLowEnergy?: boolean;
  reason?: string;
}

export interface AffectedTask {
  instance: TaskInstance;
  overlapMin: number;
  recommendation: AdjustmentAction;
  options: AdjustmentAction[];
  moveTarget?: number; // 分钟数，0-1440
  moveTargetLowEnergy?: number;
  moveIsShortened?: boolean;
  shortenDurationMin?: number;
  reason: string;
}
