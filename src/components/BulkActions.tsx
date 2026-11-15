'use client';

import { useState, useCallback, useMemo } from 'react';

export function useBulkSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const count = selected.size;

  return { selected, selectedIds, count, toggle, isSelected, toggleAll, clear };
}

interface BulkAction {
  label: string;
  style?: 'success' | 'danger' | 'primary' | 'neutral';
  onClick: () => void;
  loading?: boolean;
}

export function BulkActionBar({ count, actions, onClear }: { count: number; actions: BulkAction[]; onClear: () => void; }) {
  if (count === 0) return null;

  const styleClasses: Record<string, string> = {
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25',
    neutral: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-3 sm:p-4 pointer-events-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">{count}</div>
            <span className="text-sm font-bold text-white">{count} selected</span>
          </div>
          <div className="h-8 w-px bg-slate-700 shrink-0 hidden sm:block"></div>
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {actions.map((action, i) => (
              <button key={i} onClick={action.onClick} disabled={action.loading} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${styleClasses[action.style || 'neutral']}`}>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          <button onClick={onClear} className="flex items-center gap-1 px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold shrink-0" title="Clear selection">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-up { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </div>
  );
}

export function BulkCheckbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean; }) {
  return (
    <label className={`inline-flex items-center justify-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} shrink-0`}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only peer" />
      <span className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center peer-checked:bg-blue-600 peer-checked:border-blue-600 ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
      </span>
    </label>
  );
}