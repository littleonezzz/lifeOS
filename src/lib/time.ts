// 时间工具：所有时间按设备本地时区处理，统一用 "HH:MM" 与 "YYYY-MM-DD"。
// 任务区间允许跨午夜（如睡眠 23:00→07:00），splitInterval 把它拆成不跨午夜的段。

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function toMinutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (((h ?? 0) * 60 + (m ?? 0)) % 1440 + 1440) % 1440;
}

export function toHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(d: Date = new Date()): string {
  return dateToStr(d);
}

export function strToDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: string, n: number): string {
  const d = strToDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}

export function weekday(s: string): number {
  return strToDate(s).getDay();
}

export function nowHHMM(d: Date = new Date()): string {
  return toHHMM(d.getHours() * 60 + d.getMinutes());
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function nowEpoch(): number {
  return Date.now();
}

/** 把 [start, start+dur) 拆成落在 [0,1440) 内的不跨午夜段 */
export function splitInterval(start: number, dur: number): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let s = ((start % 1440) + 1440) % 1440;
  let remaining = Math.max(0, dur);
  while (remaining > 0 && segs.length < 4) {
    const e = Math.min(1440, s + remaining);
    segs.push([s, e]);
    remaining -= e - s;
    s = 0;
  }
  return segs;
}

/** 两个可能跨午夜的区间的重叠分钟数 */
export function overlapMin(aStart: number, aDur: number, bStart: number, bDur: number): number {
  const a = splitInterval(aStart, aDur);
  const b = splitInterval(bStart, bDur);
  let total = 0;
  for (const [as, ae] of a) {
    for (const [bs, be] of b) {
      const ov = Math.min(ae, be) - Math.max(as, bs);
      if (ov > 0) total += ov;
    }
  }
  return total;
}

/** 睡眠窗口时长（从 sleepTarget 到次日 wakeTarget） */
export function sleepDurationMin(sleepTarget: string, wakeTarget: string): number {
  const s = toMinutes(sleepTarget);
  const w = toMinutes(wakeTarget);
  return s >= w ? 1440 - s + w : w - s;
}

/** 任务是否侵入睡眠窗口（用于移动后的睡眠保护校验） */
export function overlapsSleep(
  taskStart: number,
  taskDur: number,
  sleepTarget: string,
  wakeTarget: string
): boolean {
  return overlapMin(taskStart, taskDur, toMinutes(sleepTarget), sleepDurationMin(sleepTarget, wakeTarget)) > 0;
}

/** 在 [wakeTarget, sleepTarget] 内、afterMin 之后，找第一个能容纳 durNeeded 分钟的空隙 */
export function findFreeGap(
  afterMin: number,
  durNeeded: number,
  busy: Array<[number, number]>,
  wakeTarget: string,
  sleepTarget: string
): number | null {
  const start = Math.max(afterMin, toMinutes(wakeTarget));
  const endLimit = toMinutes(sleepTarget);
  if (endLimit <= start) return null;
  const iv = busy
    .filter(([s, e]) => e > start && s < endLimit)
    .map(([s, e]) => [Math.max(s, start), Math.min(e, endLimit)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let cursor = start;
  for (const [s, e] of iv) {
    if (s - cursor >= durNeeded) return cursor;
    if (e > cursor) cursor = e;
    if (cursor >= endLimit) break;
  }
  if (endLimit - cursor >= durNeeded) return cursor;
  return null;
}

export function formatDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m <= 0) return '0 分钟';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h} 小时 ${mm} 分钟`;
  if (h) return `${h} 小时`;
  return `${mm} 分钟`;
}

export function formatHM(hhmm: string): string {
  // "07:00" -> "7:00" 更自然的中文显示
  const [h, m] = hhmm.split(':');
  return `${Number(h)}:${m}`;
}

export function formatDateCN(s: string): string {
  const d = strToDate(s);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${WEEKDAY_CN[d.getDay()]}`;
}

export function formatDateShort(s: string): string {
  const d = strToDate(s);
  return `${d.getMonth() + 1}/${d.getDate()} ${WEEKDAY_CN[d.getDay()]}`;
}

export function startOfWeek(s: string): string {
  const d = strToDate(s);
  const w = d.getDay();
  const diff = w === 0 ? -6 : 1 - w; // 回到周一
  d.setDate(d.getDate() + diff);
  return dateToStr(d);
}

export function weekDays(weekStart: string): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
}

export function isSameWeek(a: string, b: string): boolean {
  return startOfWeek(a) === startOfWeek(b);
}

/** 把 epoch 毫秒映射到其本地日期的分钟数（0-1440，可能因跨夜 > 不超过 1440） */
export function epochToLocalMinutes(epoch: number): number {
  const d = new Date(epoch);
  return d.getHours() * 60 + d.getMinutes();
}

export function epochToDateStr(epoch: number): string {
  return dateToStr(new Date(epoch));
}

/** 两个 epoch 之间的分钟数 */
export function minutesBetween(aEpoch: number, bEpoch: number): number {
  return Math.max(0, Math.round((bEpoch - aEpoch) / 60000));
}
