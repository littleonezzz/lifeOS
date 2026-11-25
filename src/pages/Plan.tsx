import { useMemo, useState } from 'react';
import { useApp } from '../state/store';
import { todayStr, startOfWeek, weekDays, weekday, formatDateShort, toMinutes, formatHM } from '../lib/time';
import { buildInstancesForDate, getInstancesForDate } from '../lib/schedule';
import { CATEGORY_LABEL } from '../data/defaultTemplates';
import { Sheet, EmptyState } from '../components/ui';
import { TemplateEditSheet } from '../components/TemplateEditSheet';
import { IconPlus, IconEdit } from '../components/icons';
import type { Category, TaskTemplate } from '../types';

const CAT_ORDER: Category[] = ['sleep', 'work', 'health', 'family', 'reading', 'english', 'itai', 'life', 'other'];

export function Plan() {
  const { data } = useApp();
  const today = todayStr();
  const ws = startOfWeek(today);
  const days = weekDays(ws);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [editTpl, setEditTpl] = useState<{ tpl: TaskTemplate; isNew: boolean } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<Category, TaskTemplate[]>();
    for (const c of CAT_ORDER) map.set(c, []);
    for (const t of data.templates) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return CAT_ORDER.map((c) => ({ cat: c, list: (map.get(c) ?? []).slice().sort((a, b) => toMinutes(a.start) - toMinutes(b.start)) })).filter((g) => g.list.length > 0);
  }, [data.templates]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>计划</h1>
          <div className="sub">本周 {formatDateShort(ws)} 起</div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setEditTpl({ tpl: blankTemplate(), isNew: true })}>
          <IconPlus width={16} height={16} /> 新建
        </button>
      </header>

      <div className="section-title">本周概览</div>
      <div className="card card-pad">
        <div className="week-grid">
          {days.map((d) => {
            const existing = getInstancesForDate(data.instances, d);
            const preview = existing.length ? existing : buildInstancesForDate(data.templates, d, data.settings);
            const train = preview.find((i) => i.category === 'health');
            const learn = preview.filter((i) => ['itai', 'reading', 'english', 'other'].includes(i.category) && toMinutes(i.start) >= 19 * 60);
            const dt = new Date(`${d}T00:00:00`);
            return (
              <div key={d} className={`d ${d === today ? 'today' : ''}`} onClick={() => setPreviewDate(d)} style={{ cursor: 'pointer' }}>
                <div className="n">{dt.getDate()}</div>
                <div>{['日', '一', '二', '三', '四', '五', '六'][weekday(d)]}</div>
                <div className="dots">
                  {train && <span style={{ background: 'var(--cat-health)' }} title={train.title} />}
                  {learn.length > 0 && <span style={{ background: 'var(--cat-itai)' }} title="晚间学习" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>点击某天查看当日任务；晚间学习与训练按星期轮换。</div>
      </div>

      <div className="section-title">任务模板</div>
      {grouped.map((g) => (
        <div key={g.cat} className="card card-pad" style={{ marginBottom: 12 }}>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className={`badge cat cat-${g.cat}`}><span className="dot" />{CATEGORY_LABEL[g.cat]}</span>
            <span className="faint" style={{ fontSize: 12 }}>{g.list.length} 项</span>
          </div>
          {g.list.map((t) => (
            <div key={t.id} className="task" style={{ gridTemplateColumns: '56px 1fr auto' }}>
              <div className="time">{formatHM(t.start)}<span className="dur">{t.durationMin}分</span></div>
              <div className="body">
                <div className="title" style={{ fontSize: 14 }}>{t.title}{!t.enabled && <span className="faint"> · 已停用</span>}</div>
                <div className="meta">
                  <span className="badge">{repeatLabel(t)}</span>
                  {t.lowEnergy && <span className="badge">低能量 {t.lowEnergy.durationMin}分</span>}
                  {t.fixed && <span className="badge">固定</span>}
                </div>
              </div>
              <div className="acts">
                <button className="icon-btn" onClick={() => setEditTpl({ tpl: t, isNew: false })} aria-label="编辑">
                  <IconEdit width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <DayPreviewSheet date={previewDate} onClose={() => setPreviewDate(null)} />

      <TemplateEditSheet
        template={editTpl?.tpl ?? null}
        isNew={editTpl?.isNew ?? false}
        onClose={() => setEditTpl(null)}
      />
    </div>
  );
}

function repeatLabel(t: TaskTemplate): string {
  if (t.repeat.type === 'daily') return '每天';
  const days = t.repeat.days ?? [];
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  if (days.length === 7) return '每天';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return '工作日';
  return '周' + days.map((d) => names[d]).join('、');
}

function blankTemplate(): TaskTemplate {
  return {
    id: '',
    title: '',
    category: 'life',
    priority: 'protected',
    start: '12:00',
    durationMin: 30,
    repeat: { type: 'daily' },
    fixed: false,
    enabled: true
  };
}

function DayPreviewSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data } = useApp();
  if (!date) return null;
  const existing = getInstancesForDate(data.instances, date);
  const list = existing.length ? existing : buildInstancesForDate(data.templates, date, data.settings);
  const isPast = date < todayStr();
  return (
    <Sheet open={!!date} title={`${formatDateShort(date)}`} onClose={onClose}>
      <div className="hint" style={{ marginBottom: 10 }}>
        {existing.length ? '当日生成的任务。' : isPast ? '当天未生成任务记录。' : '预览（任务在到达当天后生成，可当天编辑）。'}
      </div>
      {list.length === 0 ? (
        <EmptyState title="当天无任务" />
      ) : (
        list.map((i) => (
          <div key={i.id} className="task" style={{ gridTemplateColumns: '56px 1fr' }}>
            <div className="time">{formatHM(i.start)}<span className="dur">{i.durationMin}分</span></div>
            <div className="body">
              <div className="title" style={{ fontSize: 14 }}>{i.title}</div>
              <div className="meta">
                <span className={`badge cat cat-${i.category}`}><span className="dot" />{CATEGORY_LABEL[i.category]}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}
