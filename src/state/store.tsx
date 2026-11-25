import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type {
  Adjustment,
  AppData,
  InterruptCategory,
  Settings,
  SleepRecord,
  TaskInstance,
  TaskStatus,
  TaskTemplate,
  WeekReview
} from '../types';
import { buildInstancesForDate, getInstancesForDate, isRestSkippable } from '../lib/schedule';
import { applyAdjustments } from '../lib/interrupt';
import { createInitialData, loadData, saveData } from '../lib/storage';
import { todayStr, nowEpoch } from '../lib/time';
import { uid } from '../lib/id';

type Action =
  | { type: 'GENERATE_DAY'; date: string }
  | { type: 'SET_STATUS'; id: string; status: TaskStatus }
  | { type: 'COMPLETE_TASK'; id: string; actualDurationMin?: number }
  | { type: 'EDIT_INSTANCE'; id: string; patch: Partial<TaskInstance> }
  | { type: 'SET_REST_DAY'; date: string; on: boolean }
  | { type: 'SET_LOW_ENERGY_DAY'; date: string; on: boolean }
  | { type: 'EDIT_TEMPLATE'; id: string; patch: Partial<TaskTemplate> }
  | { type: 'ADD_TEMPLATE'; template: TaskTemplate }
  | { type: 'DELETE_TEMPLATE'; id: string }
  | { type: 'START_INTERRUPT'; category: InterruptCategory; label: string; note?: string }
  | { type: 'END_INTERRUPT'; adjustments: Adjustment[] }
  | { type: 'CANCEL_INTERRUPT' }
  | { type: 'SET_SLEEP'; record: SleepRecord }
  | { type: 'SET_REVIEW'; weekStart: string; patch: Partial<WeekReview> }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'REPLACE_DATA'; data: AppData }
  | { type: 'CLEAR_DATA' };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'GENERATE_DAY': {
      const existing = Object.values(state.instances).filter((i) => i.date === action.date);
      if (existing.length > 0) return state;
      const restDay = state.restDays.includes(action.date);
      const lowEnergy = state.lowEnergyDays.includes(action.date);
      const fresh = buildInstancesForDate(state.templates, action.date, state.settings, {
        restDay,
        lowEnergyDay: lowEnergy
      });
      if (fresh.length === 0) return state;
      const instances = { ...state.instances };
      for (const f of fresh) instances[f.id] = f;
      return { ...state, instances };
    }

    case 'SET_STATUS': {
      const inst = state.instances[action.id];
      if (!inst) return state;
      const next: TaskInstance = { ...inst, status: action.status };
      if (action.status === 'done' && next.actualDurationMin === undefined) {
        next.actualDurationMin = inst.durationMin;
      }
      return { ...state, instances: { ...state.instances, [action.id]: next } };
    }

    case 'COMPLETE_TASK': {
      const inst = state.instances[action.id];
      if (!inst) return state;
      const next: TaskInstance = {
        ...inst,
        status: 'done',
        actualDurationMin: action.actualDurationMin ?? inst.durationMin
      };
      return { ...state, instances: { ...state.instances, [action.id]: next } };
    }

    case 'EDIT_INSTANCE': {
      const inst = state.instances[action.id];
      if (!inst) return state;
      return {
        ...state,
        instances: { ...state.instances, [action.id]: { ...inst, ...action.patch } }
      };
    }

    case 'SET_REST_DAY': {
      let restDays = state.restDays.slice();
      const instances = { ...state.instances };
      if (action.on) {
        if (!restDays.includes(action.date)) restDays.push(action.date);
        // 把当日待办的工作/训练/学习标记为跳过（休息日）
        for (const inst of Object.values(instances)) {
          if (inst.date === action.date && inst.status === 'pending' && isRestSkippable(inst.category)) {
            instances[inst.id] = { ...inst, status: 'skipped', note: (inst.note ? inst.note + ' ' : '') + '休息日跳过。' };
          }
        }
      } else {
        restDays = restDays.filter((d) => d !== action.date);
        for (const inst of Object.values(instances)) {
          if (inst.date === action.date && inst.status === 'skipped' && inst.note?.includes('休息日跳过')) {
            instances[inst.id] = { ...inst, status: 'pending', note: inst.note.replace('休息日跳过。', '').trim() };
          }
        }
      }
      return { ...state, restDays, instances };
    }

    case 'SET_LOW_ENERGY_DAY': {
      let lowEnergyDays = state.lowEnergyDays.slice();
      const instances = { ...state.instances };
      if (action.on) {
        if (!lowEnergyDays.includes(action.date)) lowEnergyDays.push(action.date);
        for (const inst of Object.values(instances)) {
          if (inst.date === action.date && inst.status === 'pending' && inst.lowEnergyMin && !inst.isLowEnergy) {
            instances[inst.id] = {
              ...inst,
              originalDurationMin: inst.originalDurationMin ?? inst.durationMin,
              durationMin: inst.lowEnergyMin,
              isLowEnergy: true
            };
          }
        }
      } else {
        lowEnergyDays = lowEnergyDays.filter((d) => d !== action.date);
        for (const inst of Object.values(instances)) {
          if (inst.date === action.date && inst.isLowEnergy && inst.originalDurationMin) {
            instances[inst.id] = {
              ...inst,
              durationMin: inst.originalDurationMin,
              isLowEnergy: false,
              originalDurationMin: undefined
            };
          }
        }
      }
      return { ...state, lowEnergyDays, instances };
    }

    case 'EDIT_TEMPLATE': {
      const templates = state.templates.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t));
      return { ...state, templates };
    }

    case 'ADD_TEMPLATE': {
      return { ...state, templates: [...state.templates, action.template] };
    }

    case 'DELETE_TEMPLATE': {
      return { ...state, templates: state.templates.filter((t) => t.id !== action.id) };
    }

    case 'START_INTERRUPT': {
      const activeInterrupt = {
        id: uid('int'),
        date: todayStr(),
        category: action.category,
        label: action.label,
        startEpoch: nowEpoch(),
        note: action.note
      };
      return { ...state, activeInterrupt };
    }

    case 'END_INTERRUPT': {
      if (!state.activeInterrupt) return state;
      const rec = { ...state.activeInterrupt, endEpoch: nowEpoch() };
      rec.durationMin = Math.max(1, Math.round((rec.endEpoch - rec.startEpoch) / 60000));
      const dayInstances = getInstancesForDate(state.instances, rec.date);
      const instances = applyAdjustments(state.instances, action.adjustments, rec, state.settings);
      // 保持 lint：dayInstances 用于确保上下文一致（applyAdjustments 内部按 id 操作）
      void dayInstances;
      return {
        ...state,
        instances,
        interrupts: [...state.interrupts, rec],
        activeInterrupt: undefined
      };
    }

    case 'CANCEL_INTERRUPT': {
      return { ...state, activeInterrupt: undefined };
    }

    case 'SET_SLEEP': {
      const sleepRecords = { ...state.sleepRecords, [action.record.date]: action.record };
      return { ...state, sleepRecords };
    }

    case 'SET_REVIEW': {
      const existing = state.reviews[action.weekStart];
      const review: WeekReview = {
        weekStart: action.weekStart,
        goodThings: action.patch.goodThings ?? existing?.goodThings ?? '',
        blockers: action.patch.blockers ?? existing?.blockers ?? '',
        improveOne: action.patch.improveOne ?? existing?.improveOne ?? '',
        updatedAt: Date.now()
      };
      return { ...state, reviews: { ...state.reviews, [action.weekStart]: review } };
    }

    case 'UPDATE_SETTINGS': {
      const settings: Settings = {
        ...state.settings,
        ...action.patch,
        lowEnergy: { ...state.settings.lowEnergy, ...(action.patch.lowEnergy ?? {}) }
      };
      return { ...state, settings };
    }

    case 'REPLACE_DATA': {
      return action.data;
    }

    case 'CLEAR_DATA': {
      return createInitialData();
    }

    default:
      return state;
  }
}

interface Ctx {
  data: AppData;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => loadData());

  // 持久化
  useEffect(() => {
    try {
      saveData(data);
    } catch (e) {
      console.error(e);
    }
  }, [data]);

  // 主题
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const theme = data.settings.theme;
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    if (data.settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [data.settings.theme]);

  const value = useMemo(() => ({ data, dispatch }), [data]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用');
  return ctx;
}

/** 便捷：确保某天实例已生成 */
export function ensureDay(dispatch: Dispatch<Action>, date: string) {
  dispatch({ type: 'GENERATE_DAY', date });
}
