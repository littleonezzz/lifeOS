import { useEffect, useState } from 'react';
import type { Category, Priority, TaskTemplate } from '../types';
import { useApp } from '../state/store';
import { CATEGORY_LABEL, defaultPriority } from '../data/defaultTemplates';
import { uid } from '../lib/id';
import { Sheet, ConfirmDialog } from './ui';
import { IconTrash } from './icons';

const CATEGORIES: Category[] = ['sleep', 'work', 'health', 'family', 'reading', 'english', 'itai', 'life', 'other'];
const WD = ['日', '一', '二', '三', '四', '五', '六'];

export function TemplateEditSheet({
  template,
  isNew,
  onClose
}: {
  template: TaskTemplate | null;
  isNew: boolean;
  onClose: () => void;
}) {
  const { dispatch } = useApp();
  const [t, setT] = useState<TaskTemplate | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (template) setT({ ...template });
  }, [template]);

  if (!t) return null;
  const set = (patch: Partial<TaskTemplate>) => setT({ ...t, ...patch });
  const setCat = (category: Category) => set({ category, priority: defaultPriority(category) });
  const days = t.repeat.days ?? [];
  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    set({ repeat: { type: 'weekly', days: next } });
  };

  const save = () => {
    const final: TaskTemplate = {
      ...t,
      title: t.title.trim() || '未命名任务',
      durationMin: Math.max(1, Math.round(t.durationMin)),
      repeat: t.repeat.type === 'daily' ? { type: 'daily' } : { type: 'weekly', days: days.length ? days : [1] }
    };
    if (isNew) dispatch({ type: 'ADD_TEMPLATE', template: { ...final, id: uid('t') } });
    else dispatch({ type: 'EDIT_TEMPLATE', id: final.id, patch: final });
    onClose();
  };

  return (
    <>
      <Sheet
        open={!!template}
        title={isNew ? '新建任务模板' : '编辑任务模板'}
        onClose={onClose}
        footer={
          <div className="row">
            {!isNew && (
              <button className="btn btn-soft" onClick={() => setConfirmDel(true)} style={{ color: 'var(--danger)' }}>
                <IconTrash width={16} height={16} /> 删除
              </button>
            )}
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>保存</button>
          </div>
        }
      >
        <div className="field">
          <label>任务名称</label>
          <input className="input" value={t.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
        <div className="row">
          <div className="field">
            <label>开始时间</label>
            <input className="input" type="time" value={t.start} onChange={(e) => set({ start: e.target.value })} />
          </div>
          <div className="field">
            <label>时长（分钟）</label>
            <input className="input" type="number" min={1} value={t.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>分类</label>
            <select className="select" value={t.category} onChange={(e) => setCat(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>优先级</label>
            <select className="select" value={t.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
              <option value="protected">受保护（不移动）</option>
              <option value="flexible">可移动（学习类）</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>重复</label>
          <div className="row">
            <button className={`btn btn-sm ${t.repeat.type === 'daily' ? 'btn-primary' : 'btn-soft'}`} onClick={() => set({ repeat: { type: 'daily' } })}>每天</button>
            <button className={`btn btn-sm ${t.repeat.type === 'weekly' ? 'btn-primary' : 'btn-soft'}`} onClick={() => set({ repeat: { type: 'weekly', days: days.length ? days : [1] } })}>按星期</button>
          </div>
        </div>
        {t.repeat.type === 'weekly' && (
          <div className="weekday-pick" style={{ marginBottom: 12 }}>
            {WD.map((w, i) => (
              <button key={i} className={days.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)}>{w}</button>
            ))}
          </div>
        )}
        <div className="toggle">
          <div>固定时段（中断时不移动，只能继续/缩短）</div>
          <div className={`switch ${t.fixed ? 'on' : ''}`} onClick={() => set({ fixed: !t.fixed })} role="switch" aria-checked={t.fixed} />
        </div>
        <div className="toggle">
          <div>低能量版本（最低完成版本）</div>
          <div className={`switch ${t.lowEnergy ? 'on' : ''}`} onClick={() => set({ lowEnergy: t.lowEnergy ? undefined : { durationMin: 15 } })} role="switch" aria-checked={!!t.lowEnergy} />
        </div>
        {t.lowEnergy && (
          <div className="field" style={{ marginTop: 8 }}>
            <label>低能量时长（分钟）</label>
            <input className="input" type="number" min={1} value={t.lowEnergy.durationMin} onChange={(e) => set({ lowEnergy: { ...t.lowEnergy!, durationMin: Number(e.target.value) } })} />
          </div>
        )}
        <div className="field" style={{ marginTop: 8 }}>
          <label>备注</label>
          <textarea className="textarea" value={t.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </div>
        <div className="toggle">
          <div>启用此任务</div>
          <div className={`switch ${t.enabled ? 'on' : ''}`} onClick={() => set({ enabled: !t.enabled })} role="switch" aria-checked={t.enabled} />
        </div>
      </Sheet>
      <ConfirmDialog
        open={confirmDel}
        title="删除任务模板？"
        message="将删除该模板；已生成的历史任务记录不受影响，未来不再生成。"
        danger
        confirmText="删除"
        onConfirm={() => { if (t) { dispatch({ type: 'DELETE_TEMPLATE', id: t.id }); setConfirmDel(false); onClose(); } }}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}
