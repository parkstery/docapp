import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import {
  ArrowLeft,
  Bold,
  FileText,
  Heading2,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Redo2,
  Save,
  Strikethrough,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { FileInfo, FreeDoc } from '../types';
import { storage } from '../services/storage';
import { deleteFile, uploadFile } from '../services/fileService';
import { useResizableColumns } from '../hooks/useResizableColumns';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FONT_SIZE_OPTIONS = ['12px', '14px', '16px', '18px', '20px', '24px', '28px'];

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

function stripHtml(html: string): string {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function isBodyEffectivelyEmpty(html: string): boolean {
  if (!html.trim()) return true;
  if (/<img\s/i.test(html)) return false;
  return stripHtml(html).length === 0;
}

interface ViewProps {
  appId: string;
}

interface RichFreeEditorProps {
  appId: string;
  docId: string;
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  setUploading: (v: boolean) => void;
}

const RichFreeEditor: React.FC<RichFreeEditorProps> = ({
  appId,
  docId,
  initialHtml,
  onHtmlChange,
  placeholder = '내용을 입력하세요. 이미지는 붙여넣기 또는 드래그 앤 드롭으로 넣을 수 있습니다.',
  disabled,
  setUploading,
}) => {
  const editorRef = useRef<Editor | null>(null);
  const uploadImagesRef = useRef<(files: File[]) => Promise<void>>(async () => {});

  const uploadImages = useCallback(
    async (files: File[]) => {
      const ed = editorRef.current;
      if (!ed || disabled) return;
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (!imageFiles.length) return;
      setUploading(true);
      try {
        for (const file of imageFiles) {
          if (file.size > MAX_IMAGE_BYTES) {
            alert(`이미지는 10MB 이하여야 합니다: ${file.name}`);
            continue;
          }
          const fi = await uploadFile(appId, `freeDocs/${docId}/inline`, file);
          const edNow = editorRef.current;
          if (!edNow || edNow.isDestroyed) break;
          edNow.chain().focus().setImage({ src: fi.url, alt: file.name }).run();
        }
      } catch (e: any) {
        console.error('[FreeDoc] 이미지 업로드 실패:', e);
        alert(e?.message || '이미지 업로드에 실패했습니다.');
      } finally {
        setUploading(false);
      }
    },
    [appId, docId, disabled, setUploading]
  );

  useEffect(() => {
    uploadImagesRef.current = uploadImages;
  }, [uploadImages]);

  const onHtmlChangeRef = useRef(onHtmlChange);
  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  /** 참조가 매 렌더마다 바뀌면 TipTap이 setOptions로 content(구 initialHtml)를 다시 넣어 방금 삽입한 이미지가 사라짐 */
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      FontSize,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded border border-slate-200 my-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder]
  );

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          'tiptap focus:outline-none min-h-[420px] px-4 py-3 text-sm text-slate-800 prose prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3',
      },
      handleDrop(_view: unknown, event: DragEvent, _slice: unknown, moved: boolean) {
        if (moved) return false;
        const dt = event.dataTransfer;
        if (!dt?.files?.length) return false;
        const imgs = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) return false;
        event.preventDefault();
        void uploadImagesRef.current(imgs);
        return true;
      },
      handlePaste(_view: unknown, event: ClipboardEvent) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) return false;
        event.preventDefault();
        void uploadImagesRef.current(imgs);
        return true;
      },
    }),
    []
  );

  const editor = useEditor(
    {
      extensions,
      content: initialHtml || '',
      editable: !disabled,
      editorProps,
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      onUpdate: ({ editor: ed }) => {
        onHtmlChangeRef.current(ed.getHTML());
      },
    },
    [docId]
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const runImagePick = () => {
    imageInputRef.current?.click();
  };

  const currentFontSize = (editor.getAttributes('textStyle')?.fontSize as string) || '16px';

  const applyFontSize = (size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    const markType = editor.state.schema.marks.textStyle;
    if (markType) {
      const tr = editor.state.tr.addStoredMark(markType.create({ fontSize: size }));
      editor.view.dispatch(tr);
    }
  };

  const onImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      await uploadImages(Array.from(files));
    }
    e.target.value = '';
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[420px] border rounded-lg bg-slate-50 text-slate-500 text-sm gap-2">
        <Loader2 className="animate-spin" size={18} /> 에디터 로딩…
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40 ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-900' : ''}`}
          title="굵게"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40 ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-900' : ''}`}
          title="기울임"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          className={`p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40 ${editor.isActive('strike') ? 'bg-indigo-100 text-indigo-900' : ''}`}
          title="취소선"
        >
          <Strikethrough size={16} />
        </button>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={`p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40 ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-900' : ''}`}
          title="제목 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40 ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-900' : ''}`}
          title="글머리 목록"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40 ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-900' : ''}`}
          title="번호 목록"
        >
          <ListOrdered size={16} />
        </button>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <select
          value={currentFontSize}
          disabled={disabled}
          onChange={(e) => {
            applyFontSize(e.target.value);
          }}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 disabled:opacity-40"
          title="글자 크기"
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <button
          type="button"
          onClick={runImagePick}
          disabled={disabled}
          className="p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40"
          title="이미지 삽입"
        >
          <ImageIcon size={16} />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onImageInputChange}
        />
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          className="p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40"
          title="실행 취소"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          className="p-2 rounded-md text-slate-700 hover:bg-slate-200 disabled:opacity-40"
          title="다시 실행"
        >
          <Redo2 size={16} />
        </button>
      </div>
      <EditorContent editor={editor} />
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-indigo-100' : 'hover:bg-slate-100'}`}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-indigo-100' : 'hover:bg-slate-100'}`}
          >
            <Italic size={14} />
          </button>
        </BubbleMenu>
      )}
    </div>
  );
};

export const FreeDocView: React.FC<ViewProps> = ({ appId }) => {
  const [docs, setDocs] = useState<FreeDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<FreeDoc>>({});
  const [editForm, setEditForm] = useState<Partial<FreeDoc>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dragOverDocId, setDragOverDocId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const resize = useResizableColumns(5, [18, 22, 172, 252, 100]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  const [bodyHtml, setBodyHtml] = useState('');
  const [modalHtml, setModalHtml] = useState('');

  useEffect(() => {
    loadDocs();
  }, [appId]);

  const getFileList = (item: Partial<FreeDoc> | null | undefined): FileInfo[] => item?.fileInfoList || [];

  const loadDocs = async () => {
    setLoading(true);
    const list = await storage.freeDocs.list(appId);
    const hasOrder = list.some((d) => typeof d.order === 'number');
    const sorted = hasOrder
      ? [...list].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      : [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setDocs(sorted);
    setLoading(false);
  };

  const normalizeDocOrder = (list: FreeDoc[]) => list.map((d, index) => ({ ...d, order: index }));

  const moveDoc = (list: FreeDoc[], fromId: string, toId: string): FreeDoc[] => {
    const fromIndex = list.findIndex((d) => d.id === fromId);
    const toIndex = list.findIndex((d) => d.id === toId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const persistOrder = async (ordered: FreeDoc[]) => {
    const normalized = normalizeDocOrder(ordered);
    setDocs(normalized);
    setReordering(true);
    try {
      await Promise.all(
        normalized.map((d) =>
          storage.freeDocs.save({
            ...d,
            updatedAt: Date.now(),
          })
        )
      );
    } catch (error) {
      console.error('[FreeDoc] 순서 저장 실패:', error);
      alert('순서 저장에 실패했습니다.');
      await loadDocs();
    } finally {
      setReordering(false);
    }
  };

  const openModal = () => {
    const id = crypto.randomUUID();
    setForm({ id, title: '', html: '', fileInfoList: [] });
    setModalHtml('');
    setIsModalOpen(true);
  };

  const handleSelect = (d: FreeDoc) => {
    setSelectedId(d.id);
    setEditForm({ ...d, fileInfoList: d.fileInfoList || [] });
    setBodyHtml(d.html || '');
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setEditForm({});
    setBodyHtml('');
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const doc = docs.find((item) => item.id === id);
    for (const f of getFileList(doc)) {
      try {
        await deleteFile(f.url);
      } catch (error) {
        console.error('파일 삭제 실패:', error);
      }
    }
    await storage.freeDocs.delete(id);
    loadDocs();
    if (selectedId === id) {
      setSelectedId(null);
      setEditForm({});
    }
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!form.title || form.title.trim() === '') {
      alert('제목을 입력하세요');
      return;
    }
    if (isBodyEffectivelyEmpty(modalHtml)) {
      alert('내용을 입력하세요');
      return;
    }
    try {
      const item: FreeDoc = {
        id: form.id!,
        appId,
        title: form.title.trim(),
        html: modalHtml,
        createdAt: form.createdAt || Date.now(),
        updatedAt: Date.now(),
        fileInfoList: getFileList(form),
        order: docs.length,
      };
      await storage.freeDocs.save(item);
      loadDocs();
      setIsModalOpen(false);
      setForm({});
      setModalHtml('');
    } catch (error: any) {
      console.error('[FreeDoc] 저장 실패:', error);
      alert(`저장에 실패했습니다.\n\n${error?.message || ''}`);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.title || editForm.title.trim() === '') {
      alert('제목을 입력하세요');
      return;
    }
    if (isBodyEffectivelyEmpty(bodyHtml)) {
      alert('내용을 입력하세요');
      return;
    }
    try {
      const item: FreeDoc = {
        id: editForm.id!,
        appId,
        title: editForm.title.trim(),
        html: bodyHtml,
        createdAt: editForm.createdAt || Date.now(),
        updatedAt: Date.now(),
        fileInfoList: getFileList(editForm),
        order: editForm.order,
      };
      await storage.freeDocs.save(item);
      loadDocs();
      setEditForm(item);
      setSaveMessageVisible(true);
      setTimeout(() => setSaveMessageVisible(false), 2000);
    } catch (error: any) {
      console.error('[FreeDoc] 저장 실패:', error);
      alert(`저장에 실패했습니다.\n\n${error?.message || ''}`);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === docs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(docs.map((d) => d.id)));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개를 삭제하시겠습니까?`)) return;
    for (const id of selectedIds) {
      const doc = docs.find((d) => d.id === id);
      for (const f of getFileList(doc)) {
        try {
          await deleteFile(f.url);
        } catch (error) {
          console.error('파일 삭제 실패:', error);
        }
      }
      await storage.freeDocs.delete(id);
    }
    setSelectedIds(new Set());
    loadDocs();
    if (selectedId && selectedIds.has(selectedId)) {
      setSelectedId(null);
      setEditForm({});
    }
  };

  const processFile = async (file: File, target: 'form' | 'editForm') => {
    if (uploadingAttachment) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    setUploadingAttachment(true);
    try {
      const docId = target === 'editForm' ? editForm.id : form.id;
      const fileInfo = await uploadFile(appId, `freeDocs/${docId || 'new'}`, file);
      if (target === 'editForm') {
        setEditForm((prev) => ({ ...prev, fileInfoList: [...getFileList(prev), fileInfo] }));
      } else {
        setForm((prev) => ({ ...prev, fileInfoList: [...getFileList(prev), fileInfo] }));
      }
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (error: any) {
      console.error('[FreeDoc] 파일 업로드 실패:', error);
      alert(`파일 업로드 실패: ${error?.message || '알 수 없는 오류'}`);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (detailFileInputRef.current) detailFileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) await processFile(files[i], 'form');
    }
    e.target.value = '';
  };

  const handleDetailFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) await processFile(files[i], 'editForm');
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadingAttachment) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, target: 'form' | 'editForm') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) await processFile(files[i], target);
    }
  };

  const handleDeleteFile = async (fileInfo: FileInfo, target: 'form' | 'editForm') => {
    if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) return;
    try {
      await deleteFile(fileInfo.url);
      if (target === 'editForm') {
        const list = getFileList(editForm).filter((f) => f.url !== fileInfo.url);
        setEditForm({ ...editForm, fileInfoList: list });
      } else {
        const list = getFileList(form).filter((f) => f.url !== fileInfo.url);
        setForm({ ...form, fileInfoList: list });
      }
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  const handleRowDragStart = (docId: string) => {
    setDraggingDocId(docId);
    setDragOverDocId(docId);
  };

  const handleRowDragOver = (e: React.DragEvent, targetDocId: string) => {
    e.preventDefault();
    if (dragOverDocId !== targetDocId) setDragOverDocId(targetDocId);
  };

  const handleRowDrop = async (e: React.DragEvent, targetDocId: string) => {
    e.preventDefault();
    if (!draggingDocId) return;
    if (draggingDocId === targetDocId) {
      setDraggingDocId(null);
      setDragOverDocId(null);
      return;
    }
    const reordered = moveDoc(docs, draggingDocId, targetDocId);
    setDraggingDocId(null);
    setDragOverDocId(null);
    await persistOrder(reordered);
  };

  const handleRowDragEnd = () => {
    setDraggingDocId(null);
    setDragOverDocId(null);
  };

  if (selectedId && editForm.id) {
    return (
      <>
        {saveMessageVisible && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium">
            저장되었습니다
          </div>
        )}
        <div className="h-full flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-bold text-lg text-slate-800">프리 수정</h3>
              {uploading && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="animate-spin" size={14} /> 이미지 업로드 중…
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2 bg-slate-300 text-slate-700 hover:bg-slate-400 rounded-lg text-sm transition-colors"
              >
                목록으로
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={uploading}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm flex items-center gap-1 font-medium transition-colors disabled:opacity-50"
              >
                <Save size={14} /> 저장
              </button>
              <button
                type="button"
                onClick={() => deleteDoc(editForm.id!)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm flex items-center gap-1 font-medium transition-colors"
              >
                <Trash2 size={14} /> 삭제
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="pt-0 px-4 sm:px-8 pb-6 sm:pb-8 flex-1 overflow-y-auto">
              <div className="mb-2 pb-2 border-b">
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-1">
                  <span>작성일: {new Date(editForm.createdAt || 0).toLocaleString()}</span>
                  {editForm.updatedAt && editForm.updatedAt !== editForm.createdAt && (
                    <span>수정일: {new Date(editForm.updatedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="space-y-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">제목</label>
                  <input
                    className="w-full border rounded-lg p-3 text-lg font-semibold focus:ring-2 ring-violet-500 outline-none"
                    placeholder="제목"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">본문 (WYSIWYG)</label>
                  <RichFreeEditor
                    key={editForm.id}
                    appId={appId}
                    docId={editForm.id}
                    initialHtml={editForm.html || ''}
                    onHtmlChange={setBodyHtml}
                    setUploading={setUploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">첨부파일</label>
                  {uploadSuccess && <span className="text-xs text-green-600 font-medium mb-2 block">파일이 업로드 되었습니다</span>}
                  <input ref={detailFileInputRef} type="file" multiple onChange={handleDetailFileInputChange} className="hidden" />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => void handleDrop(e, 'editForm')}
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${isDragging ? 'border-primary bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'} ${uploadingAttachment ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <p className="text-xs text-slate-600 mb-1">파일을 여기에 드래그 앤 드롭하거나</p>
                    <button type="button" onClick={() => detailFileInputRef.current?.click()} disabled={uploadingAttachment} className="w-full text-primary hover:text-indigo-800 text-xs font-medium py-2 px-3 rounded border border-primary/20 transition-colors disabled:opacity-50">
                      클릭하여 파일 선택
                    </button>
                  </div>
                  {getFileList(editForm).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {getFileList(editForm).map((f) => (
                        <div key={f.id || f.url} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={16} className="text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-800 truncate">{f.name}</span>
                            {f.size != null && <span className="text-xs text-slate-500">({(f.size / 1024).toFixed(2)} KB)</span>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-indigo-800 text-xs px-2 py-1 rounded hover:bg-indigo-50">읽기</a>
                            <a href={f.url} download={f.name} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50">다운로드</a>
                            <button type="button" onClick={() => handleDeleteFile(f, 'editForm')} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50">삭제</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h3 className="font-bold text-lg text-slate-800">프리</h3>
        <div className="flex flex-wrap gap-2">
          {reordering && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Loader2 className="animate-spin" size={12} /> 순서 저장 중…
            </span>
          )}
          <button
            type="button"
            onClick={openModal}
            className="bg-violet-500 hover:bg-violet-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm font-medium"
          >
            <Plus size={16} /> 작성하기
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm"
            >
              <Trash2 size={16} /> 선택 삭제 ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="animate-spin" /> 로딩 중…
            </div>
          ) : (
            <>
              <div className="lg:hidden p-3 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={docs.length > 0 && selectedIds.size === docs.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    전체 선택
                  </label>
                </div>
                {docs.map((d, index) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => handleRowDragStart(d.id)}
                    onDragOver={(e) => handleRowDragOver(e, d.id)}
                    onDrop={(e) => void handleRowDrop(e, d.id)}
                    onDragEnd={handleRowDragEnd}
                    className={`border rounded-lg p-3 bg-white transition-colors ${
                      dragOverDocId === d.id ? 'border-violet-400 bg-violet-50' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelect(d)}
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate">{index + 1}. {d.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm text-slate-600 mt-2 truncate">{stripHtml(d.html) || (d.html?.includes('<img') ? '[이미지]' : '')}</p>
                      </button>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => handleToggleSelect(d.id)}
                        className="mt-1 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                ))}
                {docs.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    작성된 프리 문서가 없습니다.
                  </div>
                )}
              </div>

              <table className="hidden lg:table report-table-separators min-w-full divide-y divide-slate-200" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  {resize.widths.map((_, i) => (
                    <col key={i} style={resize.getColStyle(i)} />
                  ))}
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th style={resize.getThStyle(0)} className="px-6 py-3 report-col-tight report-col-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={docs.length > 0 && selectedIds.size === docs.length}
                          onChange={handleSelectAll}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                      </div>
                      <resize.ResizeHandle columnIndex={0} />
                    </th>
                    <th style={resize.getThStyle(1)} className="px-6 py-3 report-col-tight report-col-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center">No.</div>
                      <resize.ResizeHandle columnIndex={1} />
                    </th>
                    <th style={resize.getThStyle(2)} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Title<resize.ResizeHandle columnIndex={2} />
                    </th>
                    <th style={resize.getThStyle(3)} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Preview<resize.ResizeHandle columnIndex={3} />
                    </th>
                    <th style={resize.getThStyle(4)} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date<resize.ResizeHandle columnIndex={4} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {docs.map((d, index) => (
                  <tr
                    key={d.id}
                    draggable
                    onDragStart={() => handleRowDragStart(d.id)}
                    onDragOver={(e) => handleRowDragOver(e, d.id)}
                    onDrop={(e) => void handleRowDrop(e, d.id)}
                    onDragEnd={handleRowDragEnd}
                    className={`group transition-colors cursor-move ${
                      dragOverDocId === d.id ? 'bg-violet-100/70' : 'hover:bg-violet-50/60'
                    }`}
                  >
                      <td className="px-6 py-4 report-col-tight report-col-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => handleToggleSelect(d.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                      </td>
                      <td className="px-6 py-4 report-col-tight report-col-center whitespace-nowrap text-sm text-slate-500 cursor-pointer" onClick={() => handleSelect(d)}>
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => handleSelect(d)}>
                        <div className="text-sm font-medium text-slate-900">{d.title}</div>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => handleSelect(d)}>
                        <div className="text-sm text-slate-600 line-clamp-2">{stripHtml(d.html) || (d.html?.includes('<img') ? '[이미지]' : '')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 cursor-pointer" onClick={() => handleSelect(d)}>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {docs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        작성된 프리 문서가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {isModalOpen && form.id && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">새 프리 작성</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={uploading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  저장
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                  <X size={20} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {uploading && (
                <p className="text-xs text-violet-600 flex items-center gap-1">
                  <Loader2 className="animate-spin" size={14} /> 이미지 업로드 중…
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                <input
                  className="w-full border rounded-lg p-2.5 focus:ring-2 ring-violet-500 outline-none"
                  placeholder="제목"
                  value={form.title || ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">본문</label>
                <RichFreeEditor
                  key={form.id}
                  appId={appId}
                  docId={form.id}
                  initialHtml=""
                  onHtmlChange={setModalHtml}
                  setUploading={setUploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">첨부파일</label>
                {uploadSuccess && <span className="text-xs text-green-600 font-medium mb-2 block">파일이 업로드 되었습니다</span>}
                <input ref={fileInputRef} type="file" multiple onChange={handleFileInputChange} className="hidden" />
                <div className="space-y-2">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => void handleDrop(e, 'form')}
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${isDragging ? 'border-primary bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'} ${uploadingAttachment ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <p className="text-xs text-slate-600 mb-1">파일을 여기에 드래그 앤 드롭하거나</p>
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachment} className="w-full text-primary hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer text-xs font-medium py-2 px-3 rounded border border-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    클릭하여 파일 선택
                  </button>
                </div>
                {getFileList(form).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {getFileList(form).map((f) => (
                      <div key={f.id || f.url} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-800 truncate">{f.name}</span>
                          {f.size != null && <span className="text-xs text-slate-500">({(f.size / 1024).toFixed(2)} KB)</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-indigo-800 text-xs px-2 py-1 rounded hover:bg-indigo-50">읽기</a>
                          <a href={f.url} download={f.name} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50">다운로드</a>
                          <button type="button" onClick={() => handleDeleteFile(f, 'form')} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
