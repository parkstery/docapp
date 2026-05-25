import React from 'react';
import { PlanningContentEditor } from './PlanningContentEditor';
import { MarkdownPreview } from './MarkdownPreview';

export interface DocumentMarkdownSplitEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Tailwind min-height classes for editor/preview panes */
  paneMinHeight?: string;
  onStructuredPaste?: () => void;
}

const DEFAULT_PANE_MIN = 'min-h-[320px] xl:min-h-[360px]';

/**
 * 기획서와 동일: Markdown 편집 + Paste Normalizer 미리보기 (Cursor 채팅·표)
 */
export const DocumentMarkdownSplitEditor: React.FC<DocumentMarkdownSplitEditorProps> = ({
  value,
  onChange,
  placeholder = 'Cursor 채팅 내용을 붙여넣으세요...',
  paneMinHeight = DEFAULT_PANE_MIN,
  onStructuredPaste,
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <PlanningContentEditor
        className={`w-full ${paneMinHeight} p-4 resize-y outline-none border rounded-xl font-mono text-sm bg-slate-50/50 focus:bg-white focus:ring-2 ring-indigo-500`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onStructuredPaste={onStructuredPaste}
      />
      <div className={`flex flex-col ${paneMinHeight} border rounded-xl bg-white overflow-hidden`}>
        <div className="px-3 py-2 border-b bg-slate-50 text-xs font-medium text-slate-600 shrink-0 flex items-center justify-between gap-2">
          <span>미리보기 · Paste Normalizer</span>
          <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide">v2</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <MarkdownPreview mode="planning" content={value} />
        </div>
      </div>
    </div>
  );
};
