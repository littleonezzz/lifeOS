import { useEffect, useState } from 'react';

/** 每秒刷新一次的“当前时间”钩子，用于计时器与跨日检测 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
