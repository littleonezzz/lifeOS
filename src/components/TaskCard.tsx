import { useState } from 'react';
import type { TaskInstance } from '../types';
import { useApp } from '../state/store';
import { CATEGORY_LABEL } from '../data/defaultTemplates';
import { formatDuration, formatHM, toMinutes } from '../lib/time';
import { IconCheck, IconClock, IconEdit, IconSkip } from './icons';

const STATUS_LABEL: Record<TaskInstance['status'], string> = {
  pending: '待开始',
  done: '已完成',
  skipped: '已跳过',
  moved: '已延期',
  shortened: '已缩短'
};

export function TaskCard({
  inst,
  onEdit
}: {
  inst: TaskInstance;
  onEdit?: (inst: TaskInstance) => void;
}) {
  const { dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const done = inst.status === 'done';
  const skipped = inst.status === 'skipped';
  const moved = inst.status === 'moved';

  return (
    <div className={`task ${inst.status}`}>
      <div className="time">
        {formatHM(inst.start)}
        <span className="dur">{formatDuration(inst.durationMin)}</span>
        {inst.isLowEnergy && <span className="dur" style={{ color: 'var(--cat-english)' }}>低能量</span>}
      </div>

      <div className="body" onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
        <div className="title">{inst.title}</div>
        <div className="meta">
          <span className={`badge cat cat-${inst.category}`}>
            <span className="dot" />
            {CATEGORY_LABEL[inst.category]}
          </span>
          {inst.status !== 'pending' && (
            <span className={`badge st-${inst.status}`}>{STATUS_LABEL[inst.status]}</span>
          )}
          {inst.originalStart && inst.start !== inst.originalStart && (
            <span className="badge st-moved">原 {formatHM(inst.originalStart)}</span>
          )}
        </div>
        {open && !done && !skipped && (
          <div className="meta" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'COMPLETE_TASK', id: inst.id }); }}>
              <IconCheck width={14} height={14} /> 完成
            </button>
            <button className="btn btn-sm btn-soft" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_STATUS', id: inst.id, status: 'moved' }); }}>
              <IconClock width={14} height={14} /> 延期
            </button>
            <button className="btn btn-sm btn-soft" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_STATUS', id: inst.id, status: 'skipped' }); }}>
              <IconSkip width={14} height={14} /> 跳过
            </button>
            {onEdit && (
              <button className="btn btn-sm btn-soft" onClick={(e) => { e.stopPropagation(); onEdit(inst); }}>
                <IconEdit width={14} height={14} /> 编辑
              </button>
            )}
          </div>
        )}
        {open && (done || skipped) && onEdit && (
          <div className="meta" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-soft" onClick={(e) => { e.stopPropagation(); onEdit(inst); }}>
              <IconEdit width={14} height={14} /> 编辑
            </button>
            <button className="btn btn-sm btn-soft" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_STATUS', id: inst.id, status: 'pending' }); }}>
              撤销
            </button>
          </div>
        )}
        {open && moved && (
          <div className="meta" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-soft" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_STATUS', id: inst.id, status: 'pending' }); }}>
              恢复待办
            </button>
          </div>
        )}
      </div>

      <div className="acts">
        {!done && !skipped && !moved && (
          <button
            className="icon-btn check"
            onClick={() => dispatch({ type: 'COMPLETE_TASK', id: inst.id })}
            aria-label="完成"
          >
            <IconCheck width={18} height={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export function taskStartMin(inst: TaskInstance): number {
  return toMinutes(inst.start);
}
