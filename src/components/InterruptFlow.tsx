import { useMemo, useState } from 'react';
import type { Adjustment, AdjustmentAction, AffectedTask, InterruptCategory } from '../types';
import { useApp } from '../state/store';
import { useToast } from './ui';
import { INTERRUPT_LABELS } from '../data/defaultTemplates';
import { detectAffected, interruptDurationMin } from '../lib/interrupt';
import { getInstancesForDate } from '../lib/schedule';
import { formatDuration, toHHMM } from '../lib/time';
import { CATEGORY_LABEL } from '../data/defaultTemplates';
import { useNow } from '../lib/useNow';
import { Sheet } from './ui';

/* ---------- 开始中断 ---------- */
export function InterruptStartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useApp();
  const { toast } = useToast();
  const [cat, setCat] = useState<InterruptCategory>('wife-phone');
  const [note, setNote] = useState('');

  const start = () => {
    const meta = INTERRUPT_LABELS[cat];
    dispatch({ type: 'START_INTERRUPT', category: cat, label: meta.label, note: note.trim() || undefined });
    toast('已开始计时，专注当下。');
    setNote('');
    onClose();
  };

  return (
    <Sheet open={open} title="开始中断计时" onClose={onClose}>
      <div className="hint" style={{ marginBottom: 12 }}>
        中断是生活的一部分，不是失败。选择类型后开始计时，结束后再一起安排被打扰的任务。
      </div>
      <div className="field">
        <label>类型</label>
        <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {(Object.keys(INTERRUPT_LABELS) as InterruptCategory[]).map((k) => (
            <button
              key={k}
              className={`chip ${cat === k ? 'on' : ''}`}
              onClick={() => setCat(k)}
              style={{ justifyContent: 'flex-start' }}
            >
              <span style={{ marginRight: 6 }}>{INTERRUPT_LABELS[k].emoji}</span>
              {INTERRUPT_LABELS[k].label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>备注（可选）</label>
        <textarea className="textarea" placeholder="例如：和妻子聊聊今天的安排" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-block" onClick={start}>
        开始计时
      </button>
    </Sheet>
  );
}

/* ---------- 进行中计时横幅 ---------- */
export function InterruptTimerBanner({ onEnd }: { onEnd: () => void }) {
  const { data, dispatch } = useApp();
  const now = useNow(1000);
  const rec = data.activeInterrupt;
  if (!rec) return null;
  const meta = INTERRUPT_LABELS[rec.category];
  const mins = interruptDurationMin(rec, now.getTime());
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.floor((mins * 60) % 60);
  const big = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;

  return (
    <div className="card timer-card">
      <div className="label">
        {meta.emoji} {meta.label} · 进行中
      </div>
      <div className="big pulse">{big}</div>
      <div className="hint" style={{ marginBottom: 10 }}>
        {rec.note ? rec.note : '放松处理，结束后会帮你整理受影响的任务。'}
      </div>
      <div className="row">
        <button className="btn btn-soft" onClick={() => dispatch({ type: 'CANCEL_INTERRUPT' })}>
          取消（不计记录）
        </button>
        <button className="btn btn-primary" onClick={onEnd}>
          结束中断
        </button>
      </div>
    </div>
  );
}

/* ---------- 结束后调整面板 ---------- */
const ACTION_LABEL: Record<AdjustmentAction, string> = {
  continue: '继续',
  shorten: '缩短',
  move: '移动',
  skip: '跳过'
};

export function AdjustPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, dispatch } = useApp();
  const { toast } = useToast();
  const rec = data.activeInterrupt;
  const now = useNow(1000);

  const affected: AffectedTask[] = useMemo(() => {
    if (!rec) return [];
    const insts = getInstancesForDate(data.instances, rec.date);
    return detectAffected(insts, rec, data.settings, now.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, data.instances, data.settings, open]);

  const [sel, setSel] = useState<Record<string, AdjustmentAction>>({});

  if (!rec) return null;

  const finalize = () => {
    const adjustments: Adjustment[] = affected.map((a) => {
      const action = sel[a.instance.id] ?? a.recommendation;
      const adj: Adjustment = { instanceId: a.instance.id, action, reason: a.reason };
      if (action === 'move' && a.moveTarget !== undefined) {
        adj.newStart = toHHMM(a.moveTarget);
        if (a.moveIsShortened && a.shortenDurationMin !== undefined) {
          adj.newDurationMin = a.shortenDurationMin;
          adj.isLowEnergy = true;
        }
      } else if (action === 'shorten' && a.shortenDurationMin !== undefined) {
        adj.newDurationMin = a.shortenDurationMin;
        adj.isLowEnergy = true;
      }
      return adj;
    });
    dispatch({ type: 'END_INTERRUPT', adjustments });
    toast('已记录中断并调整任务，睡眠已被保护。');
    setSel({});
    onClose();
  };

  const totalDur = interruptDurationMin(rec, now.getTime());

  return (
    <Sheet
      open={open}
      title="结束中断 · 安排受影响任务"
      onClose={onClose}
      footer={
        <button className="btn btn-primary btn-block" onClick={finalize} disabled={affected.length === 0}>
          {affected.length === 0 ? '没有受影响的待办任务' : `确认调整（${affected.length} 项）`}
        </button>
      }
    >
      <div className="hint" style={{ marginBottom: 8 }}>
        中断时长 <b>{formatDuration(totalDur)}</b>。下面是计划被这段中断打扰的任务，已按“保护睡眠/工作/健康/家庭”给出建议，你可以逐项调整。
      </div>

      {affected.length === 0 ? (
        <div className="center hint" style={{ padding: 24 }}>
          这段时间没有重叠的待办任务，无需调整。
        </div>
      ) : (
        affected.map((a) => {
          const cur = sel[a.instance.id] ?? a.recommendation;
          return (
            <div key={a.instance.id} className="card card-pad" style={{ marginBottom: 10 }}>
              <div className="row-between">
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {a.instance.title}
                  </div>
                  <div className="hint" style={{ marginTop: 2 }}>
                    {toHHMMFromInstance(a)} · {CATEGORY_LABEL[a.instance.category]} · 重叠 {formatDuration(a.overlapMin)}
                  </div>
                </div>
              </div>
              <div className="hint" style={{ margin: '8px 0', color: 'var(--primary-ink)' }}>
                建议：{a.reason}
              </div>
              <div className="row-3" style={{ gridTemplateColumns: `repeat(${a.options.length}, 1fr)` }}>
                {a.options.map((o) => (
                  <button
                    key={o}
                    className={`btn btn-sm ${cur === o ? 'btn-primary' : 'btn-soft'}`}
                    onClick={() => setSel((s) => ({ ...s, [a.instance.id]: o }))}
                  >
                    {ACTION_LABEL[o]}
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </Sheet>
  );
}

function toHHMMFromInstance(a: AffectedTask): string {
  return `${a.instance.start}`;
}
