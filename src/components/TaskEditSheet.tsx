import { useEffect, useState } from 'react';
import type { Category, TaskInstance } from '../types';
import { useApp } from '../state/store';
import { CATEGORY_LABEL } from '../data/defaultTemplates';
import { Sheet } from './ui';

const CATEGORIES: Category[] = ['sleep', 'work', 'health', 'family', 'reading', 'english', 'itai', 'life', 'other'];

export function TaskEditSheet({
  inst,
  onClose
}: {
  inst: TaskInstance | null;
  onClose: () => void;
}) {
  const { dispatch } = useApp();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('07:00');
  const [duration, setDuration] = useState(30);
  const [category, setCategory] = useState<Category>('life');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!inst) return;
    setTitle(inst.title);
    setStart(inst.start);
    setDuration(inst.durationMin);
    setCategory(inst.category);
    setNote(inst.note ?? '');
  }, [inst]);

  if (!inst) return null;

  const save = () => {
    dispatch({
      type: 'EDIT_INSTANCE',
      id: inst.id,
      patch: { title: title.trim() || inst.title, start, durationMin: Math.max(1, Math.round(duration)), category, note: note.trim() || undefined }
    });
    onClose();
  };

  return (
    <Sheet
      open={!!inst}
      title="编辑任务（仅当天）"
      onClose={onClose}
      footer={
        <div className="row">
          <button className="btn btn-soft" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save}>保存</button>
        </div>
      }
    >
      <div className="field">
        <label>任务名称</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="row">
        <div className="field">
          <label>开始时间</label>
          <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>时长（分钟）</label>
          <input className="input" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
      </div>
      <div className="field">
        <label>分类</label>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>备注</label>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Sheet>
  );
}
