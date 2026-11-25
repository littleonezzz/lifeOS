import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { IconClose, IconWarn } from './icons';

/* ---------- Sheet：底部抽屉 ---------- */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        {title && (
          <div className="row-between">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="关闭" style={{ border: 'none' }}>
              <IconClose width={20} height={20} />
            </button>
          </div>
        )}
        {children}
        {footer && <div style={{ marginTop: 14 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- ConfirmDialog：二次确认 ---------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onCancel} style={{ alignItems: 'center' }}>
      <div className="sheet" style={{ borderRadius: 16, maxWidth: 360, padding: 18 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {danger && <IconWarn style={{ color: 'var(--danger)', flexShrink: 0 }} />}
          <h2 style={{ margin: 0 }}>{title}</h2>
        </div>
        <div className="hint" style={{ margin: '10px 0 16px' }}>
          {message}
        </div>
        <div className="row">
          <button className="btn btn-soft" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="center" style={{ padding: '32px 12px', color: 'var(--text-soft)' }}>
      {icon && <div style={{ marginBottom: 8, color: 'var(--text-faint)' }}>{icon}</div>}
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {hint && <div className="hint" style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ---------- Toast ---------- */
interface ToastCtx {
  toast: (msg: string) => void;
}
const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const toast = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

/* ---------- SegmentedControl ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="row" style={{ gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {options.map((o) => (
        <button
          key={o.value}
          className={`btn btn-sm ${value === o.value ? 'btn-primary' : 'btn-soft'}`}
          style={{ borderRadius: 0, border: 'none', minHeight: 40 }}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
