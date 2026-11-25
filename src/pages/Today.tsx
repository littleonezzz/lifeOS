import { useEffect, useMemo, useState } from 'react';
import { useApp, ensureDay } from '../state/store';
import { todayStr, nowMinutes, nowHHMM, formatDateCN, toMinutes, overlapMin, WEEKDAY_CN } from '../lib/time';
import { getInstancesForDate } from '../lib/schedule';
import { dailyStats } from '../lib/stats';
import { TaskCard } from '../components/TaskCard';
import { InterruptStartSheet, InterruptTimerBanner, AdjustPanel } from '../components/InterruptFlow';
import { TaskEditSheet } from '../components/TaskEditSheet';
import { Sheet, Toggle, EmptyState, useToast } from '../components/ui';
import { IconClock, IconCheck } from '../components/icons';
import { useNow } from '../lib/useNow';
import type { TaskInstance } from '../types';

const TIPS = [
  '计划可以调整，不必追赶每一分钟。',
  '稳定睡眠，是这一天最重要的事。',
  '学习可以缩短，不必熬夜补。',
  '和家人通话，是生活，不是中断你的失败。',
  '完成最低版本，也比放弃强。'
];

export function Today() {
  const { data, dispatch } = useApp();
  const { toast } = useToast();
  const now = useNow(30000);
  const today = todayStr(now);
  const [startOpen, setStartOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editInst, setEditInst] = useState<TaskInstance | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  // 确保今日实例已生成；跨日时自动生成新一天
  useEffect(() => {
    ensureDay(dispatch, today);
  }, [dispatch, today]);

  const instances = useMemo(() => getInstancesForDate(data.instances, today), [data.instances, today]);
  const stats = useMemo(
    () => dailyStats(instances, data.interrupts.filter((r) => r.date === today), data.sleepRecords[today]),
    [instances, data.interrupts, today, data.sleepRecords]
  );

  const restDay = data.restDays.includes(today);
  const lowEnergy = data.lowEnergyDays.includes(today);
  const tip = TIPS[now.getDate() % TIPS.length];

  const currentTask = useMemo(() => {
    const m = nowMinutes(now);
    return instances.find((i) => overlapMin(toMinutes(i.start), i.durationMin, m, 1) > 0);
  }, [instances, now]);

  const pending = instances.filter((i) => i.status === 'pending');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>今日</h1>
          <div className="sub">{formatDateCN(today)} · {WEEKDAY_CN[now.getDay()]}</div>
        </div>
        <div className="sub" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {nowHHMM(now)}
        </div>
      </header>

      {/* 中断计时（若有） */}
      <InterruptTimerBanner onEnd={() => setAdjustOpen(true)} />

      {/* 进度 */}
      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div className="row-between">
          <div>
            <div className="hint">今日完成</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {stats.done}<span className="faint"> / {stats.total}</span>
            </div>
          </div>
          <div className="hint" style={{ textAlign: 'right', maxWidth: 160 }}>
            {currentTask ? <>正在：{currentTask.title}</> : tip}
          </div>
        </div>
        <div className="progress" style={{ marginTop: 10 }}>
          <div className="progress-bar" style={{ width: `${Math.round(stats.completionRate * 100)}%` }} />
        </div>
      </div>

      {/* 主操作 */}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={() => setStartOpen(true)} disabled={!!data.activeInterrupt}>
          <IconClock width={18} height={18} /> 开始中断
        </button>
        <button className="btn btn-soft" onClick={() => setQuickOpen(true)} disabled={pending.length === 0}>
          <IconCheck width={18} height={18} /> 快速打卡
        </button>
      </div>

      {/* 当日开关 */}
      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div className="toggle">
          <div>
            <div>设为休息日</div>
            <div className="hint">跳过当日工作/训练/学习任务，不计为失败</div>
          </div>
          <Toggle on={restDay} onChange={(v) => { dispatch({ type: 'SET_REST_DAY', date: today, on: v }); toast(v ? '已设为休息日' : '已恢复计划日'); }} />
        </div>
        <div className="toggle">
          <div>
            <div>低能量日 / 最低完成版本</div>
            <div className="hint">学习缩到最低版本、运动改为轻活动</div>
          </div>
          <Toggle on={lowEnergy} onChange={(v) => { dispatch({ type: 'SET_LOW_ENERGY_DAY', date: today, on: v }); toast(v ? '已切换低能量日' : '已恢复常规'); }} />
        </div>
      </div>

      {/* 时间线 */}
      <div className="section-title">今日时间线</div>
      <div className="card card-pad">
        {instances.length === 0 ? (
          <EmptyState title="今天还没有任务" hint="可在「计划」里检查模板，或今天设为休息日。" />
        ) : (
          instances.map((i) => <TaskCard key={i.id} inst={i} onEdit={setEditInst} />)
        )}
      </div>

      {stats.interruptCount > 0 && (
        <div className="hint center" style={{ marginTop: 12 }}>
          今日中断 {stats.interruptCount} 次，共 {stats.interruptMinutes} 分钟
        </div>
      )}

      <InterruptStartSheet open={startOpen} onClose={() => setStartOpen(false)} />
      <AdjustPanel open={adjustOpen} onClose={() => setAdjustOpen(false)} />
      <TaskEditSheet inst={editInst} onClose={() => setEditInst(null)} />

      <QuickCheckSheet open={quickOpen} onClose={() => setQuickOpen(false)} pending={pending} />
    </div>
  );
}

function QuickCheckSheet({ open, onClose, pending }: { open: boolean; onClose: () => void; pending: TaskInstance[] }) {
  const { dispatch } = useApp();
  const { toast } = useToast();
  return (
    <Sheet open={open} title="快速打卡" onClose={onClose}>
      <div className="hint" style={{ marginBottom: 10 }}>点一项即标记完成。</div>
      {pending.length === 0 ? (
        <EmptyState title="没有待办" />
      ) : (
        pending.map((i) => (
          <button
            key={i.id}
            className="btn btn-soft btn-block"
            style={{ marginBottom: 8, justifyContent: 'flex-start' }}
            onClick={() => { dispatch({ type: 'COMPLETE_TASK', id: i.id }); toast(`已完成：${i.title}`); }}
          >
            <IconCheck width={16} height={16} style={{ color: 'var(--ok)' }} />
            <span style={{ textAlign: 'left' }}>
              {i.title}
              <span className="faint" style={{ marginLeft: 6 }}>{nowHHMM()} · {i.durationMin}分</span>
            </span>
          </button>
        ))
      )}
    </Sheet>
  );
}
