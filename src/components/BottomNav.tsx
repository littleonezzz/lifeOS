import { IconPlan, IconReview, IconSettings, IconToday } from './icons';

export type Page = 'today' | 'plan' | 'review' | 'settings';

export function BottomNav({ page, onChange }: { page: Page; onChange: (p: Page) => void }) {
  const items: Array<{ key: Page; label: string; icon: typeof IconToday }> = [
    { key: 'today', label: '今日', icon: IconToday },
    { key: 'plan', label: '计划', icon: IconPlan },
    { key: 'review', label: '复盘', icon: IconReview },
    { key: 'settings', label: '设置', icon: IconSettings }
  ];
  return (
    <nav className="bottom-nav">
      <div className="inner">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              className={page === it.key ? 'active' : ''}
              onClick={() => onChange(it.key)}
              aria-label={it.label}
            >
              <Icon />
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
