import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  File,
  Clock,
  Search,
  X,
  Sparkles,
  AlertCircle,
  FileCode,
  Presentation,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { extractDocumentText } from '../../services/api';

const NOTES_STORAGE_KEY = 'pathwise_student_notes';
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.md'];

const readFileAsText = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getFileTypeMeta = (filename = '', fileType = '') => {
  const ext = (fileType || filename.split('.').pop() || '').toUpperCase();
  if (ext === 'PDF') {
    return { label: 'PDF', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: FileText };
  }
  if (ext === 'DOC' || ext === 'DOCX') {
    return { label: ext, badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: FileText };
  }
  if (ext === 'PPT' || ext === 'PPTX') {
    return { label: ext, badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Presentation };
  }
  if (ext === 'MD') {
    return { label: 'MD', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: FileCode };
  }
  return { label: 'TXT', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: File };
};

/** Load notes array from localStorage */
const loadNotes = () => {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Persist notes array to localStorage */
const saveNotes = (notes) => {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.warn('Could not persist notes:', e);
  }
};

/**
 * Public helper: returns readable note contents for AI context.
 * Intelligently extracts the most relevant excerpts when notes are large
 * to avoid sending excessive token volume to Gemini.
 */
export const getStudentNotesContext = (queryHint = '') => {
  const notes = loadNotes();
  const readableNotes = notes.filter((n) => n.content && n.content.trim().length > 0);
  if (readableNotes.length === 0) return '';

  const keywords = queryHint
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const contextBlocks = readableNotes.map((n) => {
    const text = n.content.trim();
    if (text.length <= 1500 || keywords.length === 0) {
      const excerpt = text.length > 2000 ? text.slice(0, 2000) + '\n...[content truncated]' : text;
      return `--- Document: ${n.name} (${n.fileType || 'NOTE'}) ---\n${excerpt}`;
    }

    // Relevance scoring for large documents
    const paragraphs = text.split(/\n{2,}/);
    const scored = paragraphs.map((p) => {
      const lower = p.toLowerCase();
      let score = 0;
      keywords.forEach((k) => {
        if (lower.includes(k)) score += 1;
      });
      return { paragraph: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topParagraphs = scored
      .slice(0, 4)
      .map((s) => s.paragraph)
      .join('\n\n');

    return `--- Document: ${n.name} (${n.fileType || 'NOTE'}) ---\n${topParagraphs}`;
  });

  const joined = contextBlocks.join('\n\n');
  return joined.length > 4000 ? joined.slice(0, 4000) + '\n...[additional notes truncated for brevity]' : joined;
};

export const SavedResourcesView = () => {
  const [notes, setNotes] = useState(loadNotes);
  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [expandedId, setExpandedId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // { fileName, progress, status }
  const fileInputRef = useRef(null);

  // Persist on every change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const addNoteFromFile = useCallback(async (file) => {
    if (!file) return;

    // Validate extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      showToast(`Unsupported format "${ext}". Supported: PDF, PPT, PPTX, DOC, DOCX, TXT, MD`, 'error');
      return;
    }

    // Validate size (15 MB)
    if (file.size > MAX_FILE_SIZE) {
      showToast(`File "${file.name}" exceeds the 15 MB limit (${formatBytes(file.size)}). Upload rejected.`, 'error');
      return;
    }

    setUploadStatus({ fileName: file.name, progress: 10, status: 'Uploading...' });

    try {
      let content = '';
      let fileType = ext.replace('.', '').toUpperCase();
      let pageOrSlideCount = null;
      let warning = null;

      if (ext === '.txt' || ext === '.md') {
        // Fast local extraction with progress
        content = await readFileAsText(file, (pct) => {
          setUploadStatus({ fileName: file.name, progress: pct, status: 'Reading text...' });
        });
      } else {
        // Backend text extraction via PDFBox / Apache POI
        setUploadStatus({ fileName: file.name, progress: 40, status: 'Extracting document text...' });
        const res = await extractDocumentText(file, (pct) => {
          setUploadStatus({ fileName: file.name, progress: Math.min(85, pct), status: 'Uploading & parsing...' });
        });

        content = res.content || '';
        fileType = res.fileType || fileType;
        pageOrSlideCount = res.pageOrSlideCount;
        warning = res.warning || null;
      }

      const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        fileType,
        size: file.size,
        content,
        pageOrSlideCount,
        warning,
        uploadedAt: new Date().toISOString(),
      };

      setNotes((prev) => [newNote, ...prev]);

      if (warning) {
        showToast(`"${file.name}" uploaded. Note: ${warning}`, 'warning');
      } else {
        showToast(`"${file.name}" uploaded and parsed successfully.`, 'success');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Error parsing document';
      showToast(`Failed to process "${file.name}": ${errMsg}`, 'error');
    } finally {
      setTimeout(() => setUploadStatus(null), 800);
    }
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addNoteFromFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(addNoteFromFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
    if (expandedId === noteToDelete.id) setExpandedId(null);
    showToast(`"${noteToDelete.name}" removed.`);
    setNoteToDelete(null);
  };

  const filtered = search.trim()
    ? notes.filter((n) => n.name.toLowerCase().includes(search.trim().toLowerCase()))
    : notes;

  const notesWithTextCount = notes.filter((n) => n.content && n.content.trim().length > 0).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-xs font-medium px-4 py-2.5 rounded-[10px] flex items-center space-x-2 border shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            toastType === 'error'
              ? 'bg-danger/20 border-danger/40 text-danger'
              : toastType === 'warning'
              ? 'bg-next/20 border-next/40 text-next'
              : 'bg-text text-surface-1 border-border'
          }`}
        >
          {toastType === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
          ) : toastType === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-next" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 text-accent" />
          )}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="My Notes"
        subtitle="Upload your study documents (PDF, Word, PowerPoint, Markdown, or Text). The AI Study Tutor automatically references them to answer your study questions."
      />

      {/* AI Context Status Card */}
      {notes.length > 0 && (
        <div className="p-3.5 rounded-[12px] bg-accent/10 border border-accent/25 text-xs text-accent font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {notesWithTextCount} of {notes.length} {notes.length === 1 ? 'document' : 'documents'} ready as knowledge context for the AI Study Tutor.
            </span>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 hidden sm:inline">
            Active Context
          </span>
        </div>
      )}

      {/* Progress Card during active upload */}
      {uploadStatus && (
        <div className="p-4 rounded-[12px] bg-surface-2 border border-border text-xs text-text space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span className="truncate">{uploadStatus.fileName}</span>
            </span>
            <span className="font-mono text-accent shrink-0">{uploadStatus.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-solid rounded-full transition-all duration-200"
              style={{ width: `${uploadStatus.progress}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted">{uploadStatus.status}</p>
        </div>
      )}

      {/* Drag & Drop Upload Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        className={`p-8 rounded-[16px] border-2 border-dashed text-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          isDragOver
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-accent/50 hover:bg-surface-2/50'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-accent' : 'text-text-muted'}`} />
        <p className="text-sm font-semibold text-text">
          {isDragOver ? 'Drop study documents here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-text-muted mt-1.5">
          Supports PDF, PPT, PPTX, DOC, DOCX, TXT and MD files (up to 15 MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload notes"
        />
      </div>

      {/* Search Bar */}
      {notes.length > 0 && (
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search uploaded documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs rounded-[10px] bg-surface-2 border border-border text-text placeholder:text-text-muted focus:border-accent outline-none transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-text-muted hover:text-text cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No study documents uploaded yet"
          description="Upload your lecture PDFs, PowerPoint slides, Word assignments, or notes so the AI Study Tutor can personalize its answers using your course materials."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching documents found"
          description="Try a different search keyword."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => {
            const isExpanded = expandedId === note.id;
            const meta = getFileTypeMeta(note.name, note.fileType);
            const Icon = meta.icon;

            return (
              <Card
                key={note.id}
                className="p-0 overflow-hidden transition-colors hover:border-border-strong"
              >
                {/* Note Row Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-[10px] bg-surface-2 border border-border flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text truncate block">{note.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(note.uploadedAt)}
                        </span>
                        <span>{formatBytes(note.size)}</span>
                        {note.pageOrSlideCount && (
                          <span className="hidden sm:inline">
                            {note.pageOrSlideCount} {meta.label.includes('PPT') ? 'slides' : 'pages'}
                          </span>
                        )}
                        {note.content && (
                          <span className="text-emerald-400 flex items-center gap-1 hidden sm:inline-flex">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Indexed for AI</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      className="p-2 text-text-muted hover:text-danger rounded-[8px] hover:bg-danger/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title={`Delete ${note.name}`}
                      aria-label={`Delete ${note.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scanned / Unsuccessful extraction warning */}
                {note.warning && (
                  <div className="px-4 pb-3">
                    <div className="p-2.5 rounded-[8px] bg-next/10 border border-next/30 text-xs text-next flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{note.warning}</span>
                    </div>
                  </div>
                )}

                {/* Expanded text preview */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-surface-2/40 max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 text-[11px] text-text-muted font-medium">
                      <span>Extracted Content Preview:</span>
                      <span>{note.content ? `${note.content.length.toLocaleString()} characters` : 'Empty content'}</span>
                    </div>
                    {note.content ? (
                      <pre className="text-xs text-text-2 whitespace-pre-wrap font-mono leading-relaxed">
                        {note.content.length > 5000
                          ? note.content.slice(0, 5000) + '\n\n… (preview truncated; full content indexed for AI)'
                          : note.content}
                      </pre>
                    ) : (
                      <p className="text-xs text-text-muted italic">
                        No selectable text could be extracted from this document. If this is a scanned PDF, optical character recognition (OCR) is not currently enabled.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(noteToDelete)}
        title="Delete document?"
        description={`Are you sure you want to remove "${noteToDelete?.name}"? The AI Study Tutor will no longer reference its contents.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        isDanger
        onConfirm={handleConfirmDelete}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
};

export default SavedResourcesView;
