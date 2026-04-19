import React from 'react';
import { X } from 'lucide-react';

export type UnsavedChangesDialogProps = {
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void | Promise<void>;
};

export function UnsavedChangesDialog({
  open,
  saving = false,
  onClose,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 id="unsaved-changes-title" className="text-base font-semibold text-slate-900 pr-8">
            저장되지 않았습니다. 저장하시겠습니까?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            아니오
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '예'}
          </button>
        </div>
      </div>
    </div>
  );
}
