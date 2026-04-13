import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft,
  Bold,
  ChevronRight,
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
import { FreeDoc } from '../types';
import { storage } from '../services/storage';
import { uploadFile } from '../services/fileService';
import { useResizableColumns } from '../hooks/useResizableColumns';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
          ed.chain().focus().setImage({ src: fi.url, alt: file.name }).run();
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded border border-slate-200 my-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialHtml || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'tiptap focus:outline-none min-h-[420px] px-4 py-3 text-sm text-slate-800 prose prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3',
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const dt = event.dataTransfer;
        if (!dt?.files?.length) return false;
        const imgs = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) return false;
        event.preventDefault();
        void uploadImagesRef.current(imgs);
        return true;
      },
      handlePaste(_view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) return false;
        event.preventDefault();
        void uploadImagesRef.current(imgs);
        return true;
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor: ed }) => {
      onHtmlChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const runImagePick = () => {
    imageInputRef.current?.click();
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
  const resize = useResizableColumns(6, [40, 48, 160, 240, 100, 44]);

  const [bodyHtml, setBodyHtml] = useState('');
  const [modalHtml, setModalHtml] = useState('');

  useEffect(() => {
    loadDocs();
  }, [appId]);

  const loadDocs = async () => {
    setLoading(true);
    setDocs(await storage.freeDocs.list(appId));
    setLoading(false);
  };

  const openModal = () => {
    const id = crypto.randomUUID();
    setForm({ id, title: '', html: '' });
    setModalHtml('');
    setIsModalOpen(true);
  };

  const handleSelect = (d: FreeDoc) => {
    setSelectedId(d.id);
    setEditForm({ ...d });
    setBodyHtml(d.html || '');
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setEditForm({});
    setBodyHtml('');
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
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
      await storage.freeDocs.delete(id);
    }
    setSelectedIds(new Set());
    loadDocs();
    if (selectedId && selectedIds.has(selectedId)) {
      setSelectedId(null);
      setEditForm({});
    }
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
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors"
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
            <div className="pt-0 px-8 pb-8 flex-1 overflow-y-auto">
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
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">프리</h3>
        <div className="flex gap-2">
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
            <table className="min-w-full divide-y divide-slate-200" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                {resize.widths.map((_, i) => (
                  <col key={i} style={resize.getColStyle(i)} />
                ))}
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th style={resize.getThStyle(0)} className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={docs.length > 0 && selectedIds.size === docs.length}
                      onChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <resize.ResizeHandle columnIndex={0} />
                  </th>
                  <th style={resize.getThStyle(1)} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    No.<resize.ResizeHandle columnIndex={1} />
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
                  <th style={resize.getThStyle(5)} className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {docs.map((d, index) => (
                  <tr key={d.id} className="hover:bg-violet-50/60 group transition-colors">
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => handleToggleSelect(d.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 cursor-pointer" onClick={() => handleSelect(d)}>
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
                    <td className="px-6 py-4 text-right cursor-pointer" onClick={() => handleSelect(d)}>
                      <ChevronRight size={16} className="text-slate-300 ml-auto group-hover:text-violet-600" />
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      작성된 프리 문서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && form.id && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">새 프리 작성</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                <X size={20} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
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
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
