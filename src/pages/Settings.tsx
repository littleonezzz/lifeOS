import { useRef, useState } from 'react';
import { useApp } from '../state/store';
import type { AppData, Settings as TSettings } from '../types';
import { exportJSON, parseData, buildExportFilename, createInitialData } from '../lib/storage';
import { Sheet, ConfirmDialog, Segmented, useToast } from '../components/ui';
import { IconDownload, IconUpload, IconTrash } from '../components/icons';

export function Settings() {
  const { data, dispatch } = useApp();
  const { toast } = useToast();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const set = (patch: Partial<TSettings>) => dispatch({ type: 'UPDATE_SETTINGS', patch });

  const doExport = () => {
    const blob = new Blob([exportJSON(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFilename();
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出备份文件');
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseData(String(reader.result));
        setPendingImport(parsed);
        setImportErr(null);
      } catch (e) {
        setImportErr(e instanceof Error ? e.message : '导入失败');
        setPendingImport(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>设置</h1>
        <div className="sub">作息 · 数据 · 隐私</div>
      </header>

      <div className="section-title">作息</div>
      <div className="card card-pad">
        <div className="row">
          <TimeField label="目标起床" value={s.wakeTarget} onChange={(v) => set({ wakeTarget: v })} />
          <TimeField label="目标就寝" value={s.sleepTarget} onChange={(v) => set({ sleepTarget: v })} />
        </div>
        <TimeField label="睡前准备开始" value={s.sleepPrepStart} onChange={(v) => set({ sleepPrepStart: v })} />
      </div>

      <div className="section-title">工作与通勤</div>
      <div className="card card-pad">
        <div className="row">
          <TimeField label="上班" value={s.workStart} onChange={(v) => set({ workStart: v })} />
          <TimeField label="下班" value={s.workEnd} onChange={(v) => set({ workEnd: v })} />
        </div>
        <div className="row">
          <TimeField label="午休开始" value={s.lunchStart} onChange={(v) => set({ lunchStart: v })} />
          <TimeField label="午休结束" value={s.lunchEnd} onChange={(v) => set({ lunchEnd: v })} />
        </div>
        <div className="row">
          <NumField label="通勤（分钟）" value={s.commuteMin} onChange={(v) => set({ commuteMin: v })} />
          <NumField label="到健身房（分钟）" value={s.gymCommuteMin} onChange={(v) => set({ gymCommuteMin: v })} />
        </div>
      </div>

      <div className="section-title">学习频率（次/周）</div>
      <div className="card card-pad">
        <div className="row-3">
          <NumField label="阅读" value={s.readingFreqPerWeek} onChange={(v) => set({ readingFreqPerWeek: v })} />
          <NumField label="英语" value={s.englishFreqPerWeek} onChange={(v) => set({ englishFreqPerWeek: v })} />
          <NumField label="IT/AI" value={s.itaiFreqPerWeek} onChange={(v) => set({ itaiFreqPerWeek: v })} />
        </div>
      </div>

      <div className="section-title">低能量 / 最低完成版本（分钟）</div>
      <div className="card card-pad">
        <div className="row-3">
          <NumField label="阅读" value={s.lowEnergy.reading} onChange={(v) => set({ lowEnergy: { ...s.lowEnergy, reading: v } })} />
          <NumField label="IT/AI" value={s.lowEnergy.itai} onChange={(v) => set({ lowEnergy: { ...s.lowEnergy, itai: v } })} />
          <NumField label="英语" value={s.lowEnergy.english} onChange={(v) => set({ lowEnergy: { ...s.lowEnergy, english: v } })} />
        </div>
        <NumField label="运动轻活动" value={s.lowEnergy.exercise} onChange={(v) => set({ lowEnergy: { ...s.lowEnergy, exercise: v } })} />
      </div>

      <div className="section-title">主题</div>
      <div className="card card-pad">
        <Segmented
          value={s.theme}
          options={[
            { value: 'system', label: '跟随系统' },
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' }
          ]}
          onChange={(v) => set({ theme: v })}
        />
      </div>

      <div className="section-title">数据备份</div>
      <div className="card card-pad">
        <div className="hint" style={{ marginBottom: 10 }}>所有数据仅存在本机，不向任何第三方上传。</div>
        <div className="stack">
          <button className="btn btn-soft btn-block" onClick={doExport}>
            <IconDownload width={18} height={18} /> 导出 JSON 备份
          </button>
          <button className="btn btn-soft btn-block" onClick={() => fileRef.current?.click()}>
            <IconUpload width={18} height={18} /> 导入 JSON（覆盖）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
          />
          <button className="btn btn-soft btn-block" style={{ color: 'var(--danger)' }} onClick={() => setConfirmClear(true)}>
            <IconTrash width={18} height={18} /> 清空本地数据
          </button>
        </div>
        {importErr && <div className="hint" style={{ marginTop: 10, color: 'var(--danger)' }}>导入失败：{importErr}</div>}
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setAboutOpen(true)}>
          关于 LifeOS 与隐私
        </button>
      </div>

      <ConfirmDialog
        open={!!pendingImport}
        title="确认导入并覆盖？"
        message="导入将完全覆盖当前所有数据（模板、任务、中断、复盘）。建议先导出一份备份。"
        danger
        confirmText="覆盖导入"
        onConfirm={() => { if (pendingImport) { dispatch({ type: 'REPLACE_DATA', data: pendingImport }); setPendingImport(null); toast('已导入数据'); } }}
        onCancel={() => setPendingImport(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="清空所有数据？"
        message="将删除全部本地数据并恢复默认模板，无法撤销。"
        danger
        confirmText="清空"
        onConfirm={() => { dispatch({ type: 'CLEAR_DATA' }); setConfirmClear(false); toast('已清空并恢复默认'); }}
        onCancel={() => setConfirmClear(false)}
      />

      <Sheet open={aboutOpen} title="关于 LifeOS" onClose={() => setAboutOpen(false)}>
        <div className="hint stack">
          <p>LifeOS 是手机优先的离线个人生活节奏管理工具，管理睡眠、工作、健身、阅读、英语、IT/AI 学习，并处理妻子电话等突发中断后的任务重排。</p>
          <p>· 所有数据保存在本机浏览器，不接入外部分析、广告、云端 AI，不上传个人数据。</p>
          <p>· 应用不会自动检测睡眠或读取通话记录；中断由你手动开始与结束。</p>
          <p>· 妻子电话等中断是中性事件，不计为失败，不施加惩罚。</p>
          <p>· 睡眠受保护：任务不会被推迟到就寝时间之后。</p>
          <p>数据版本：{data.version}，模板 {data.templates.length} 项，记录始于 {new Date(data.createdAt).toLocaleDateString()}。</p>
          <p style={{ color: 'var(--text-faint)' }}>默认数据共 {createInitialData().templates.length} 个模板。</p>
        </div>
      </Sheet>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
