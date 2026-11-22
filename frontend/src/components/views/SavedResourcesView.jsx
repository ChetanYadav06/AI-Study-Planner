import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Upload, Trash2, File, Clock, Search, X, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const NOTES_STORAGE_KEY = 'pathwise_student_notes';
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_TYPES = ['.txt', '.md'];
const ACCEPTED_MIME = ['text/plain', 'text/markdown'];

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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
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
 * Public helper: returns all stored note contents joined for AI context.
 * Importable by AiAssistantView.
 */
export const getStudentNotesContext = () => {
  const notes = loadNotes();
  if (notes.length === 0) return '';
  return notes
    .map((n) => `--- ${n.name} ---\n${n.content}`)
    .join('\n\n');
};

export const SavedResourcesView = () => {
  const [notes, setNotes] = useState(loadNotes);
  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Persist on every change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const addNoteFromFile = useCallback(async (file) => {
    if (!file) return;

    // Validate type
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      showToast(`Unsupported file type. Use ${ACCEPTED_TYPES.join(', ')}`);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      showToast(`File "${file.name}" exceeds the 15 MB limit (${formatBytes(file.size)}). Upload rejected.`);
      return;
    }

    try {
      setUploadProgress(10);
      const content = await readFileAsText(file, (pct) => setUploadProgress(pct));
      const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        content,
        uploadedAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      showToast(`"${file.name}" uploaded successfully.`);
    } catch {
      showToast(`Failed to read "${file.name}".`);
    } finally {
      setTimeout(() => setUploadProgress(null), 800);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-text text-surface-1 text-xs font-medium px-4 py-2.5 rounded-[10px] flex items-center space-x-2 border border-border animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="My Notes"
        subtitle="Upload your study notes. The AI tutor uses them to give you personalized answers."
      />

      {/* AI context info */}
      {notes.length > 0 && (
        <div className="p-3 rounded-[10px] bg-accent/10 border border-accent/20 text-xs text-accent font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} available as context for the AI Study Assistant.
          </span>
        </div>
      )}

      {/* Upload area */}
      {uploadProgress !== null && (
        <div className="p-3 rounded-[10px] bg-surface-2 border border-border text-xs text-text space-y-1.5 animate-in fade-in">
          <div className="flex justify-between font-medium">
            <span>Reading & processing note...</span>
            <span className="font-mono text-accent">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-solid rounded-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

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
          {isDragOver ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-text-muted mt-1">
          Accepts .txt, .md up to 15 MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload notes"
        />
      </div>

      {/* Search bar (show only when notes exist) */}
      {notes.length > 0 && (
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes..."
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

      {/* Notes list */}
      {notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes uploaded yet"
          description="Upload your study notes so the AI tutor can reference them when answering your questions."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching notes"
          description="Try a different search term."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((note) => {
            const isExpanded = expandedId === note.id;
            return (
              <Card
                key={note.id}
                className="p-0 overflow-hidden transition-colors hover:border-border-strong"
              >
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-surface-2 border border-border flex items-center justify-center shrink-0">
                    <File className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-text truncate block">{note.name}</span>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.uploadedAt)}
                      </span>
                      <span>{formatBytes(note.size)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteToDelete(note);
                    }}
                    className="p-2 text-text-muted hover:text-danger rounded-[8px] hover:bg-danger/10 transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title={`Delete ${note.name}`}
                    aria-label={`Delete ${note.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>

                {/* Expanded preview */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-surface-2/40 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-text-2 whitespace-pre-wrap font-mono leading-relaxed">
                      {note.content.length > 5000
                        ? note.content.slice(0, 5000) + '\n\n… (truncated)'
                        : note.content}
                    </pre>
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
        title="Delete note?"
        description={`Are you sure you want to remove "${noteToDelete?.name}"? The AI tutor will no longer reference it.`}
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
