import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../state/store';
import { todayStr, addDays, startOfWeek, formatDateShort, formatDateCN, toMinutes } from '../lib/time';
import { dailyStats, weeklyStats, recentDailyRates } from '../lib/stats';
import { getInstancesForDate } from '../lib/schedule';
import type { WeekReview } from '../types';

export function Review() {
  const { data, dispatch } = useApp();
  const today = todayStr();
  const ws = startOfWeek(today);

  const dayStats = useMemo(
    () => dailyStats(getInstancesForDate(data.instances, today), data.interrupts.filter((r) => r.date === today), data.sleepRecords[today]),
    [data.instances, data.interrupts, today, data.sleepRecords]
  );
  const week = useMemo(() => weeklyStats(data, today), [data, today]);
  const trend = useMemo(() => recentDailyRates(data, 7), [data]);

  const review = data.reviews[ws];

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>复盘</h1>
        <div className="sub">{formatDateCN(today)}</div>
      </header>

      <div className="section-title">今日</div>
      <Card>
        <div className="stat-grid">
          <Stat k="完成" v={`${dayStats.done}/${dayStats.total}`} />
          <Stat k="完成率" v={`${Math.round(dayStats.completionRate * 100)}%`} />
          <Stat k="跳过" v={dayStats.skipped} />
          <Stat k="延期" v={dayStats.moved} />
          <Stat k="中断次数" v={dayStats.interruptCount} />
          <Stat k="中断时长" v={dayStats.interruptMinutes} u="分钟" />
        </div>
      </Card>

      <div className="section-title">本周 {formatDateShort(ws)}</div>
      <Card>
        <div className="stat-grid">
          <Stat k="运动次数" v={week.exerciseCount} />
          <Stat k="阅读分钟" v={week.readingMinutes} u="分钟" />
          <Stat k="阅读天数" v={week.readingDays} u="天" />
          <Stat k="英语次数" v={week.englishCount} />
          <Stat k="IT/AI 分钟" v={week.itaiMinutes} u="分钟" />
          <Stat k="完成率" v={`${Math.round(week.completionRate * 100)}%`} />
        </div>
      </Card>

      <div className="section-title">最近 7 天完成率</div>
      <Card>
        <div className="trend">
          {trend.map((d) => {
            const h = Math.round(d.rate * 56);
            return <div key={d.date} className={`bar ${d.rate >= 1 ? 'full' : ''}`} style={{ height: Math.max(2, h) }} title={`${d.done}/${d.total}`} />;
          })}
        </div>
        <div className="trend" style={{ height: 'auto', marginTop: 4 }}>
          {trend.map((d) => (
            <div key={d.date} className="lbl">{new Date(`${d.date}T00:00:00`).getDate()}</div>
          ))}
        </div>
      </Card>

      <SleepSection />

      <div className="section-title">每周复盘 · {formatDateShort(ws)}</div>
      <Card>
        <ReviewForm
          review={review}
          onChange={(patch) => dispatch({ type: 'SET_REVIEW', weekStart: ws, patch })}
        />
      </Card>
    </div>
  );
}

function Stat({ k, v, u }: { k: string; v: string | number; u?: string }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v}{u && <span className="u"> {u}</span>}</div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="card card-pad">{children}</div>;
}

function SleepSection() {
  const { data, dispatch } = useApp();
  const [date, setDate] = useState(addDays(todayStr(), -1));
  const [bed, setBed] = useState('');
  const [wake, setWake] = useState('');

  const existing = data.sleepRecords[date];
  const recent = Object.values(data.sleepRecords)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  const save = () => {
    if (!bed && !wake) return;
    dispatch({ type: 'SET_SLEEP', record: { date, bedTime: bed || undefined, wakeTime: wake || undefined, note: existing?.note } });
  };

  const sleepMin = (r: typeof recent[number]) => {
    if (!r.bedTime || !r.wakeTime) return null;
    let m = toMinutes(r.wakeTime) - toMinutes(r.bedTime);
    if (m < 0) m += 1440;
    return m;
  };

  return (
    <>
      <div className="section-title">睡眠记录（手动填写）</div>
      <Card>
        <div className="hint" style={{ marginBottom: 8 }}>应用不会自动检测睡眠，请填写实际就寝与起床时间。</div>
        <div className="field">
          <label>日期（当晚）</label>
          <input className="input" type="date" value={date} onChange={(e) => { setDate(e.target.value); const r = data.sleepRecords[e.target.value]; setBed(r?.bedTime ?? ''); setWake(r?.wakeTime ?? ''); }} />
        </div>
        <div className="row">
          <div className="field">
            <label>实际就寝</label>
            <input className="input" type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </div>
          <div className="field">
            <label>实际起床</label>
            <input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary btn-block" onClick={save}>保存睡眠</button>

        {recent.length > 0 && (
          <>
            <div className="divider" />
            <div className="section-title" style={{ margin: '4px 0 6px' }}>最近记录</div>
            {recent.map((r) => (
              <div key={r.date} className="row-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <span className="hint">{formatDateShort(r.date)}</span>
                <span className="hint">
                  {r.bedTime ?? '--'} → {r.wakeTime ?? '--'}
                  {sleepMin(r) !== null && <span style={{ marginLeft: 6, color: 'var(--ok)' }}>{Math.floor(sleepMin(r)! / 60)}时{sleepMin(r)! % 60}分</span>}
                </span>
              </div>
            ))}
          </>
        )}
      </Card>
    </>
  );
}

function ReviewForm({ review, onChange }: { review?: WeekReview; onChange: (patch: Partial<WeekReview>) => void }) {
  return (
    <>
      <div className="field">
        <label>本周做得好的事</label>
        <textarea className="textarea" placeholder="哪怕一件小事也值得记下" defaultValue={review?.goodThings ?? ''}
          onBlur={(e) => onChange({ goodThings: e.target.value })} />
      </div>
      <div className="field">
        <label>遇到的阻碍</label>
        <textarea className="textarea" placeholder="哪些人或事打乱了节奏？" defaultValue={review?.blockers ?? ''}
          onBlur={(e) => onChange({ blockers: e.target.value })} />
      </div>
      <div className="field">
        <label>下周只改进的一件事</label>
        <textarea className="textarea" placeholder="一次只改一件事，更容易坚持" defaultValue={review?.improveOne ?? ''}
          onBlur={(e) => onChange({ improveOne: e.target.value })} />
      </div>
      <div className="hint">复盘以鼓励为主，不制造惩罚性排名。</div>
    </>
  );
}
