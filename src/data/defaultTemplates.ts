import type { Category, Priority, TaskTemplate } from '../types';

/** 分类 -> 默认优先级 */
export function defaultPriority(category: Category): Priority {
  if (category === 'reading' || category === 'english' || category === 'itai' || category === 'other') {
    return 'flexible';
  }
  return 'protected';
}

/** 分类中文名 */
export const CATEGORY_LABEL: Record<Category, string> = {
  sleep: '睡眠',
  work: '工作',
  health: '健康/健身',
  family: '家庭',
  reading: '阅读',
  english: '英语',
  itai: 'IT/AI 学习',
  life: '生活',
  other: '其他'
};

const WD = [0, 1, 2, 3, 4, 5, 6]; // 周日..周六
const WEEKDAY = [1, 2, 3, 4, 5]; // 周一..周五

interface Seed {
  id: string;
  title: string;
  category: Category;
  start: string;
  durationMin: number;
  days: number[]; // 空 = 每天
  fixed?: boolean;
  lowEnergy?: { durationMin: number; label?: string };
  note?: string;
  enabled?: boolean;
}

const SEEDS: Seed[] = [
  // —— 每日基础 ——
  { id: 't-wake', title: '起床、洗漱、早餐、准备', category: 'life', start: '07:00', durationMin: 40, days: WD, fixed: true },
  { id: 't-dinner', title: '晚餐、洗漱', category: 'life', start: '18:35', durationMin: 45, days: WD, fixed: true },
  { id: 't-family-buffer', title: '家庭联系 / 弹性缓冲', category: 'family', start: '19:20', durationMin: 40, days: WD, fixed: false,
    note: '弹性窗口：可承接妻子电话或临时家庭事务。' },
  { id: 't-wife-buffer', title: '妻子电话 / 自由时间', category: 'family', start: '21:20', durationMin: 60, days: WD, fixed: false,
    note: '中性弹性时段，通话是正常生活的一部分，不计为失败。' },
  { id: 't-sleep-prep', title: '睡前准备', category: 'life', start: '22:20', durationMin: 40, days: WD, fixed: true },
  { id: 't-sleep', title: '睡觉', category: 'sleep', start: '23:00', durationMin: 480, days: WD, fixed: true,
    note: '睡眠窗口 23:00–07:00，受保护，不被任务挤占。' },

  // —— 工作日早晨 ——
  { id: 't-commute-am', title: '通勤（含缓冲）', category: 'life', start: '08:00', durationMin: 25, days: WEEKDAY, fixed: true },
  { id: 't-work-am', title: '上午工作', category: 'work', start: '08:30', durationMin: 180, days: WEEKDAY, fixed: true },
  { id: 't-lunch', title: '午餐', category: 'life', start: '11:30', durationMin: 30, days: WEEKDAY, fixed: true },
  { id: 't-rest-noon', title: '午休', category: 'health', start: '12:00', durationMin: 25, days: WEEKDAY, fixed: true,
    note: '疲劳时优先休息，午休轻学习不影响休息。' },

  // —— 午休轻学习（按星期轮换） ——
  { id: 't-light-mon', title: '轻学习 · IT/AI', category: 'itai', start: '12:25', durationMin: 45, days: [1], fixed: false,
    lowEnergy: { durationMin: 15, label: '15 分钟轻量' } },
  { id: 't-light-tue', title: '轻学习 · 英语', category: 'english', start: '12:25', durationMin: 45, days: [2], fixed: false,
    lowEnergy: { durationMin: 10, label: '10 分钟轻量' } },
  { id: 't-light-wed', title: '轻学习 · 阅读', category: 'reading', start: '12:25', durationMin: 45, days: [3], fixed: false,
    lowEnergy: { durationMin: 5, label: '5 分钟轻量' } },
  { id: 't-light-thu', title: '轻学习 · 英语', category: 'english', start: '12:25', durationMin: 45, days: [4], fixed: false,
    lowEnergy: { durationMin: 10, label: '10 分钟轻量' } },
  { id: 't-light-fri', title: '轻学习 · 阅读', category: 'reading', start: '12:25', durationMin: 45, days: [5], fixed: false,
    lowEnergy: { durationMin: 5, label: '5 分钟轻量' } },

  // —— 下午工作 ——
  { id: 't-work-prep', title: '工作准备', category: 'work', start: '13:10', durationMin: 20, days: WEEKDAY, fixed: true },
  { id: 't-work-pm', title: '下午工作', category: 'work', start: '13:30', durationMin: 210, days: WEEKDAY, fixed: true },

  // —— 下班训练（按星期） ——
  { id: 't-train-mon', title: '健身房 · 上肢力量', category: 'health', start: '17:00', durationMin: 70, days: [1], fixed: true,
    note: '含 10 分钟通勤。如膝盖不适，替换为无痛动作。' },
  { id: 't-home-mon', title: '回家', category: 'life', start: '18:10', durationMin: 25, days: [1], fixed: true },

  { id: 't-train-tue', title: '健身房 · 低冲击有氧', category: 'health', start: '17:00', durationMin: 70, days: [2], fixed: true,
    lowEnergy: { durationMin: 10, label: '10 分钟轻活动' } },
  { id: 't-home-tue', title: '回家', category: 'life', start: '18:10', durationMin: 25, days: [2], fixed: true },

  { id: 't-train-wed', title: '健身房 · 下肢力量（无痛范围）', category: 'health', start: '17:00', durationMin: 70, days: [3], fixed: true,
    note: '无痛范围内进行，疼痛即停。' },
  { id: 't-home-wed', title: '回家', category: 'life', start: '18:10', durationMin: 25, days: [3], fixed: true },

  { id: 't-train-thu', title: '恢复 · 散步', category: 'health', start: '17:00', durationMin: 40, days: [4], fixed: false,
    lowEnergy: { durationMin: 10, label: '10 分钟轻活动' } },
  { id: 't-home-thu', title: '回家', category: 'life', start: '17:40', durationMin: 25, days: [4], fixed: true },

  { id: 't-train-fri', title: '健身房 · 全身力量', category: 'health', start: '17:00', durationMin: 70, days: [5], fixed: true },
  { id: 't-home-fri', title: '回家', category: 'life', start: '18:10', durationMin: 25, days: [5], fixed: true },

  // —— 周末训练 ——
  { id: 't-train-sat', title: '有氧 / 户外活动', category: 'health', start: '09:00', durationMin: 60, days: [6], fixed: false,
    lowEnergy: { durationMin: 10, label: '10 分钟轻活动' } },

  // —— 晚间学习（按星期） ——
  { id: 't-learn-mon', title: 'IT/AI 深度学习', category: 'itai', start: '20:00', durationMin: 50, days: [1], fixed: false,
    lowEnergy: { durationMin: 15, label: '15 分钟最低版本' } },
  { id: 't-learn-tue', title: '英语练习', category: 'english', start: '20:00', durationMin: 20, days: [2], fixed: false,
    lowEnergy: { durationMin: 10, label: '10 分钟最低版本' } },
  { id: 't-learn-wed', title: 'IT/AI 深度学习', category: 'itai', start: '20:00', durationMin: 50, days: [3], fixed: false,
    lowEnergy: { durationMin: 15, label: '15 分钟最低版本' } },
  { id: 't-learn-thu', title: '阅读', category: 'reading', start: '20:00', durationMin: 30, days: [4], fixed: false,
    lowEnergy: { durationMin: 5, label: '5 分钟最低版本' } },
  { id: 't-learn-fri', title: '轻复盘 / 休息', category: 'other', start: '20:00', durationMin: 20, days: [5], fixed: false },
  { id: 't-learn-sat', title: 'AI 实践项目', category: 'itai', start: '20:00', durationMin: 60, days: [6], fixed: false,
    lowEnergy: { durationMin: 20, label: '20 分钟最低版本' } },
  { id: 't-learn-sun', title: '周复盘与下周规划', category: 'other', start: '20:00', durationMin: 30, days: [0], fixed: false },

  // —— 阅读时段（周一至周六） ——
  { id: 't-reading', title: '阅读', category: 'reading', start: '20:50', durationMin: 30, days: [1, 2, 3, 4, 5, 6], fixed: false,
    lowEnergy: { durationMin: 5, label: '5 分钟最低版本' },
    note: '当前书目优先《潜规则》。' },

  // —— 周末白天结构 ——
  { id: 't-we-morning', title: '早晨弹性 / 家务', category: 'life', start: '08:00', durationMin: 90, days: [0, 6], fixed: false },
  { id: 't-we-noon', title: '午餐 + 休整', category: 'life', start: '12:00', durationMin: 60, days: [0, 6], fixed: true },
  { id: 't-we-afternoon', title: '下午弹性 / 家庭', category: 'family', start: '14:00', durationMin: 120, days: [0, 6], fixed: false }
];

export function buildDefaultTemplates(): TaskTemplate[] {
  return SEEDS.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    priority: defaultPriority(s.category),
    start: s.start,
    durationMin: s.durationMin,
    repeat: { type: s.days.length === 7 ? 'daily' : 'weekly', days: s.days.length === 7 ? undefined : s.days },
    fixed: s.fixed ?? false,
    lowEnergy: s.lowEnergy,
    note: s.note,
    enabled: s.enabled ?? true
  }));
}

/** 中断类型的中性文案（妻子电话不使用负面措辞） */
export const INTERRUPT_LABELS: Record<string, { label: string; emoji: string }> = {
  'wife-phone': { label: '妻子电话', emoji: '💬' },
  family: { label: '家庭事务', emoji: '🏡' },
  'temp-work': { label: '临时工作', emoji: '💼' },
  other: { label: '其他', emoji: '•' }
};
