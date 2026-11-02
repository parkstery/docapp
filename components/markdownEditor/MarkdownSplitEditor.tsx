import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Code2, Columns2, Eye, Moon, Search, Sun, WrapText } from 'lucide-react';
import { MarkdownPreview } from '../MarkdownPreview';
import { PlanningContentEditor } from '../PlanningContentEditor';
import type { CodeMirrorMarkdownHandle } from './CodeMirrorMarkdown';

/** CodeMirror는 이 편집기를 처음 열 때만 불러온다. */
const CodeMirrorMarkdown = lazy(() => import('./CodeMirrorMarkdown'));

type ViewMode = 'edit' | 'split' | 'preview';

interface EditorPrefs {
  mode: ViewMode;
  wrap: boolean;
  dark: boolean;
}

const PREFS_KEY = 'docapp.markdownEditor.prefs';
const DEFAULT_PREFS: EditorPrefs = { mode: 'split', wrap: true, dark: true };

function loadPrefs(): EditorPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<EditorPrefs>;
    return {
      mode: p.mode === 'edit' || p.mode === 'preview' || p.mode === 'split' ? p.mode : DEFAULT_PREFS.mode,
      wrap: typeof p.wrap === 'boolean' ? p.wrap : DEFAULT_PREFS.wrap,
      dark: typeof p.dark === 'boolean' ? p.dark : DEFAULT_PREFS.dark,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export interface MarkdownSplitEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onStructuredPaste?: () => void;
  ariaLabel?: string;
}

const PANE_HEIGHT = 'h-[clamp(360px,65vh,880px)]';

const MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'edit', label: '편집', icon: <Code2 size={14} /> },
  { id: 'split', label: '분할', icon: <Columns2 size={14} /> },
  { id: 'preview', label: '미리보기', icon: <Eye size={14} /> },
];

/** 기획서·보고서 본문: CodeMirror 마크다운 편집기 + 미리보기(편집/분할/미리보기 전환). */
export const MarkdownSplitEditor: React.FC<MarkdownSplitEditorProps> = ({
  value,
  onChange,
  placeholder,
  onStructuredPaste,
  ariaLabel,
}) => {
  const [prefs, setPrefs] = useState<EditorPrefs>(loadPrefs);
  const editorRef = useRef<CodeMirrorMarkdownHandle>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* 저장 불가 환경이면 이번 화면에서만 유지 */
    }
  }, [prefs]);

  const update = (patch: Partial<EditorPrefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const showEditor = prefs.mode !== 'preview';
  const showPreview = prefs.mode !== 'edit';

  const toolBtn = 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors';
  const toolIdle = 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  const toolOn = 'border-indigo-300 bg-indigo-50 text-indigo-700';

  return (
    <div className="flex flex-col gap-2 min-w-0" data-md-split-editor>
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="본문 편집 도구">
        <div className="inline-flex rounded-md border border-slate-200 bg-white overflow-hidden" role="group" aria-label="보기 방식">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={prefs.mode === m.id}
              onClick={() => update({ mode: m.id })}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs border-r last:border-r-0 border-slate-200 ${
                prefs.mode === m.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={prefs.wrap}
          disabled={!showEditor}
          onClick={() => update({ wrap: !prefs.wrap })}
          className={`${toolBtn} ${prefs.wrap ? toolOn : toolIdle} disabled:opacity-40`}
          title="긴 줄을 화면 폭에서 줄바꿈"
        >
          <WrapText size={14} />
          줄바꿈
        </button>
        <button
          type="button"
          disabled={!showEditor}
          onClick={() => update({ dark: !prefs.dark })}
          className={`${toolBtn} ${toolIdle} disabled:opacity-40`}
          title="편집기 색상 전환"
        >
          {prefs.dark ? <Sun size={14} /> : <Moon size={14} />}
          {prefs.dark ? '밝게' : '어둡게'}
        </button>
        <button
          type="button"
          disabled={!showEditor}
          onClick={() => editorRef.current?.openSearch()}
          className={`${toolBtn} ${toolIdle} disabled:opacity-40`}
          title="찾기·바꾸기 (Ctrl+F)"
        >
          <Search size={14} />
          찾기
        </button>
      </div>

      <div className={`grid gap-4 grid-cols-1 ${prefs.mode === 'split' ? 'xl:grid-cols-2' : ''}`}>
        {showEditor && (
          <div
            className={`${PANE_HEIGHT} min-w-0 border rounded-xl overflow-hidden focus-within:ring-2 ring-indigo-500 ${
              prefs.dark ? 'border-slate-700 bg-[#282c34]' : 'border-slate-200 bg-white'
            }`}
          >
            <Suspense
              fallback={
                <PlanningContentEditor
                  className="w-full h-full p-4 resize-none outline-none font-mono text-sm bg-slate-50"
                  placeholder={placeholder}
                  value={value}
                  onChange={onChange}
                  onStructuredPaste={onStructuredPaste}
                />
              }
            >
              <CodeMirrorMarkdown
                ref={editorRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                onStructuredPaste={onStructuredPaste}
                dark={prefs.dark}
                wrap={prefs.wrap}
                ariaLabel={ariaLabel}
              />
            </Suspense>
          </div>
        )}
        {showPreview && (
          <div className={`${PANE_HEIGHT} flex flex-col min-w-0 border rounded-xl bg-white overflow-hidden`}>
            <div className="px-3 py-2 border-b bg-slate-50 text-xs font-medium text-slate-600 shrink-0 flex items-center justify-between gap-2">
              <span>미리보기 · Paste Normalizer</span>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide">v2</span>
            </div>
            <div className="flex-1 overflow-auto p-4 min-w-0">
              <MarkdownPreview mode="planning" content={value} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
