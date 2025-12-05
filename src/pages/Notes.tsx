import { useState, useEffect } from 'react';
import {
  StickyNote,
  BookOpen,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight,
  Plus,
  Pencil,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { VoiceNoteInput } from '../components/VoiceNoteInput';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Note with context metadata from joined tables.
 */
interface NoteWithContext {
  id: string;
  title: string | null;
  snippet_markdown: string;
  created_at: string;
  course_id: string | null;
  lesson_id: string | null;
  course_title: string | null;
  lesson_title: string | null;
}

export function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteWithContext | null>(null);

  // Add/Edit modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteWithContext | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);

  /**
   * Fetch notes with context metadata by fetching related course and lesson data.
   */
  useEffect(() => {
    async function fetchNotes() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('id, title, snippet_markdown, created_at, course_id, lesson_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        if (!notesData || notesData.length === 0) {
          setNotes([]);
          return;
        }

        // Get unique course and lesson IDs (filter out nulls)
        const courseIds = [
          ...new Set(notesData.map((n) => n.course_id).filter(Boolean)),
        ] as string[];
        const lessonIds = [
          ...new Set(notesData.map((n) => n.lesson_id).filter(Boolean)),
        ] as string[];

        // Fetch course titles if any
        let courseMap = new Map<string, string>();
        if (courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id, title')
            .in('id', courseIds);
          courseMap = new Map((coursesData || []).map((c) => [c.id, c.title]));
        }

        // Fetch lesson titles if any
        let lessonMap = new Map<string, string>();
        if (lessonIds.length > 0) {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id, title')
            .in('id', lessonIds);
          lessonMap = new Map((lessonsData || []).map((l) => [l.id, l.title]));
        }

        const notesWithContext: NoteWithContext[] = notesData.map((note) => ({
          id: note.id,
          title: note.title,
          snippet_markdown: note.snippet_markdown,
          created_at: note.created_at,
          course_id: note.course_id,
          lesson_id: note.lesson_id,
          course_title: note.course_id ? courseMap.get(note.course_id) || null : null,
          lesson_title: note.lesson_id ? lessonMap.get(note.lesson_id) || null : null,
        }));

        setNotes(notesWithContext);
      } catch (error) {
        console.error('Error fetching notes:', error);
        toast.error('Failed to load notes');
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, [user]);

  const handleDeleteNote = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (deletingId) return;

    setDeletingId(noteId);
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;

      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (selectedNote?.id === noteId) setSelectedNote(null);
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  const openAddModal = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsEditorOpen(true);
  };

  const openEditModal = (note: NoteWithContext, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteContent(note.snippet_markdown);
    setIsEditorOpen(true);
    setSelectedNote(null);
  };

  const handleSaveNote = async () => {
    if (!user || !noteContent.trim()) {
      toast.error('Note content is required');
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: noteTitle.trim() || null,
            snippet_markdown: noteContent.trim(),
          })
          .eq('id', editingNote.id);

        if (error) throw error;

        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingNote.id
              ? { ...n, title: noteTitle.trim() || null, snippet_markdown: noteContent.trim() }
              : n
          )
        );
        toast.success('Note updated');
      } else {
        // Create new personal note
        const { data, error } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: noteTitle.trim() || null,
            snippet_markdown: noteContent.trim(),
          })
          .select('id, title, snippet_markdown, created_at, course_id, lesson_id')
          .single();

        if (error) throw error;

        const newNote: NoteWithContext = {
          id: data.id,
          title: data.title,
          snippet_markdown: data.snippet_markdown,
          created_at: data.created_at,
          course_id: null,
          lesson_id: null,
          course_title: null,
          lesson_title: null,
        };
        setNotes((prev) => [newNote, ...prev]);
        toast.success('Note created');
      }

      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const isPersonalNote = (note: NoteWithContext) => !note.course_id && !note.lesson_id;

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <h1 className="font-display text-display-lg text-neutral-text mb-6">My Notes</h1>
        <Card>
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-surface rounded-full mb-4">
                <StickyNote className="w-8 h-8 text-neutral-text-muted" />
              </div>
              <p className="font-body text-body-md text-neutral-text-muted">Loading notes...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <h1 className="font-display text-display-lg text-neutral-text mb-6">My Notes</h1>

      {notes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-surface rounded-full mb-4">
              <StickyNote className="w-8 h-8 text-neutral-text-muted" />
            </div>
            <p className="font-body text-body-md text-neutral-text-muted">
              No notes yet. Add a personal note or select text in any lesson!
            </p>
          </div>
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-border">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="w-full p-4 flex items-center gap-4 hover:bg-neutral-surface/50 transition-colors text-left"
            >
              <div className="flex-shrink-0">
                <StickyNote className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-medium text-neutral-text truncate">
                  {isPersonalNote(note)
                    ? note.title || 'Untitled Note'
                    : note.course_title || 'Unknown Course'}
                </p>
                <p className="text-sm text-neutral-text-muted truncate">
                  {isPersonalNote(note) ? 'Personal Note' : note.lesson_title || 'Unknown Lesson'}
                </p>
                <p className="text-sm text-neutral-text-muted/70 truncate">
                  {truncateText(note.snippet_markdown)}
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3">
                <span className="text-xs text-neutral-text-muted hidden sm:block">
                  {formatDate(note.created_at)}
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-text-muted" />
              </div>
            </button>
          ))}
        </Card>
      )}

      {/* Floating Add Button */}
      <button
        onClick={openAddModal}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        aria-label="Add note"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Note Detail Modal */}
      <Modal
        isOpen={selectedNote !== null}
        onClose={() => setSelectedNote(null)}
        title="Note Details"
        size="md"
      >
        {selectedNote && (
          <div className="space-y-4">
            {/* Context metadata */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-text-muted">
              {isPersonalNote(selectedNote) ? (
                <>
                  <span className="font-medium">
                    {selectedNote.title || 'Untitled Note'}
                  </span>
                  <span className="text-neutral-border">•</span>
                  <span>Personal Note</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">{selectedNote.course_title}</span>
                  </div>
                  <span className="text-neutral-border">•</span>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>{selectedNote.lesson_title}</span>
                  </div>
                </>
              )}
              <span className="text-neutral-border">•</span>
              <span>{formatDate(selectedNote.created_at)}</span>
            </div>

            {/* Note content - scrollable */}
            <div className="bg-neutral-surface rounded-lg p-4 max-h-[50vh] overflow-y-auto">
              <p className="font-body text-body-md text-neutral-text whitespace-pre-wrap">
                {selectedNote.snippet_markdown}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-border">
              <div className="flex items-center gap-3">
                {!isPersonalNote(selectedNote) && selectedNote.course_id && selectedNote.lesson_id && (
                  <Link
                    to={`/courses/${selectedNote.course_id}?lesson=${selectedNote.lesson_id}`}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
                    onClick={() => setSelectedNote(null)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View in lesson</span>
                  </Link>
                )}
                <button
                  onClick={(e) => openEditModal(selectedNote, e)}
                  className="flex items-center gap-1.5 text-sm text-neutral-text-muted hover:text-neutral-text transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>

              <button
                onClick={(e) => handleDeleteNote(selectedNote.id, e)}
                disabled={deletingId === selectedNote.id}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label="Delete note"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingId === selectedNote.id ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Note Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingNote ? 'Edit Note' : 'New Note'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-text mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Give your note a title..."
              className="w-full px-3 py-2 rounded-lg border-2 border-neutral-border bg-neutral-bg text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-neutral-text">Content</label>
              <VoiceNoteInput
                onTranscription={(text) =>
                  setNoteContent((prev) => (prev ? `${prev}\n\n${text}` : text))
                }
                disabled={saving}
              />
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note here or use voice input..."
              rows={8}
              className="w-full px-3 py-2 rounded-lg border-2 border-neutral-border bg-neutral-bg text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote} disabled={saving || !noteContent.trim()}>
              {saving ? 'Saving...' : editingNote ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
