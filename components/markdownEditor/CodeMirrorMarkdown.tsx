import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { structuredPasteInsert } from '../../utils/structuredPaste';

export interface CodeMirrorMarkdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onStructuredPaste?: () => void;
  dark: boolean;
  wrap: boolean;
  ariaLabel?: string;
}

export interface CodeMirrorMarkdownHandle {
  openSearch: () => void;
  focus: () => void;
}

const KOREAN_PHRASES = EditorState.phrases.of({
  Find: '찾기',
  Replace: '바꿀 내용',
  next: '다음',
  previous: '이전',
  all: '모두',
  'match case': '대소문자 구분',
  regexp: '정규식',
  'by word': '단어 단위',
  replace: '바꾸기',
  'replace all': '모두 바꾸기',
  close: '닫기',
  'current match': '현재 항목',
  'replaced match on line $': '$번째 줄을 바꿨습니다',
  'replaced $ matches': '$개를 바꿨습니다',
  'on line': '줄',
  'Go to line': '줄 이동',
  go: '이동',
  'Folded lines': '접힌 줄',
  'Unfolded lines': '펼친 줄',
  'Fold line': '줄 접기',
  'Unfold line': '줄 펼치기',
});

const MONO_STACK = 'ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "Malgun Gothic", monospace';

const BASE_THEME = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: MONO_STACK, lineHeight: '1.6', overflow: 'auto' },
  '.cm-content': { padding: '10px 0' },
  '.cm-line': { padding: '0 12px 0 6px' },
  '.cm-panels': { fontFamily: 'inherit' },
});

const LIGHT_THEME: Extension = [
  EditorView.theme(
    {
      '&': { backgroundColor: '#ffffff', color: '#1e293b' },
      '.cm-gutters': { backgroundColor: '#f8fafc', color: '#94a3b8', borderRight: '1px solid #e2e8f0' },
      '.cm-activeLine': { backgroundColor: '#f1f5f9' },
      '.cm-activeLineGutter': { backgroundColor: '#e2e8f0', color: '#475569' },
      '.cm-placeholder': { color: '#94a3b8' },
    },
    { dark: false }
  ),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
];

/** 편집기 기본 구성: 줄 번호·접기·되돌리기·찾기·괄호 짝·마크다운(코드 블록 언어 강조 포함). 자동 괄호 닫기·자동 완성은 글쓰기에 방해되어 뺐다. */
const BASE_EXTENSIONS: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  KOREAN_PHRASES,
  BASE_THEME,
];

const CodeMirrorMarkdown = forwardRef<CodeMirrorMarkdownHandle, CodeMirrorMarkdownProps>(
  function CodeMirrorMarkdown({ value, onChange, placeholder, onStructuredPaste, dark, wrap, ariaLabel }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onPasteRef = useRef(onStructuredPaste);
    onChangeRef.current = onChange;
    onPasteRef.current = onStructuredPaste;

    const settingsRef = useRef({ dark, wrap, placeholder, ariaLabel });
    settingsRef.current = { dark, wrap, placeholder, ariaLabel };
    const compartments = useRef({
      theme: new Compartment(),
      wrap: new Compartment(),
      placeholder: new Compartment(),
    }).current;

    const buildState = (doc: string) => {
      const s = settingsRef.current;
      return EditorState.create({
        doc,
        extensions: [
          BASE_EXTENSIONS,
          compartments.theme.of(s.dark ? oneDark : LIGHT_THEME),
          compartments.wrap.of(s.wrap ? EditorView.lineWrapping : []),
          compartments.placeholder.of(s.placeholder ? cmPlaceholder(s.placeholder) : []),
          EditorView.contentAttributes.of({ 'aria-label': s.ariaLabel || '본문 편집기' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            paste(event, view) {
              const insert = structuredPasteInsert(event.clipboardData);
              if (insert == null) return false;
              event.preventDefault();
              view.dispatch({
                ...view.state.replaceSelection(insert),
                scrollIntoView: true,
                userEvent: 'input.paste',
              });
              onPasteRef.current?.();
              return true;
            },
          }),
        ],
      });
    };

    useEffect(() => {
      if (!hostRef.current) return;
      const view = new EditorView({ state: buildState(value), parent: hostRef.current });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // 처음 한 번만 만든다. 이후 값·설정 변경은 아래 effect에서 반영.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 다른 문서로 바뀌는 등 바깥에서 값이 바뀌면 새 상태로 교체(되돌리기 기록도 함께 초기화).
    useEffect(() => {
      const view = viewRef.current;
      if (view && value !== view.state.doc.toString()) view.setState(buildState(value));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
      viewRef.current?.dispatch({ effects: compartments.theme.reconfigure(dark ? oneDark : LIGHT_THEME) });
    }, [dark, compartments]);

    useEffect(() => {
      viewRef.current?.dispatch({ effects: compartments.wrap.reconfigure(wrap ? EditorView.lineWrapping : []) });
    }, [wrap, compartments]);

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: compartments.placeholder.reconfigure(placeholder ? cmPlaceholder(placeholder) : []),
      });
    }, [placeholder, compartments]);

    useImperativeHandle(
      ref,
      () => ({
        openSearch: () => {
          const view = viewRef.current;
          if (!view) return;
          view.focus();
          openSearchPanel(view);
        },
        focus: () => viewRef.current?.focus(),
      }),
      []
    );

    return <div ref={hostRef} className="h-full min-h-0 min-w-0" data-md-editor="codemirror" />;
  }
);

export default CodeMirrorMarkdown;
