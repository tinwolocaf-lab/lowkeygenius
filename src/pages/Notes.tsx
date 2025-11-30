import { useState, useEffect } from 'react';
import { StickyNote, BookOpen, FileText, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Note with context metadata from joined tables.
 * Requirements: 4.4 - Display notes with course_title and lesson_title
 */
interface NoteWithContext {
  id: string;
  snippet_markdown: string;
  created_at: string;
  course_id: string;
  lesson_id: string;
  course_title: string;
  lesson_title: string;
}

export function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Fetch notes with context metadata by fetching related course and lesson data.
   * Requirements: 4.4 - Query to fetch notes with course and lesson titles
   */
  useEffect(() => {
    async function fetchNotes() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First, fetch all notes for the user
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('id, snippet_markdown, created_at, course_id, lesson_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (notesError) {
          throw notesError;
        }

        if (!notesData || notesData.length === 0) {
          setNotes([]);
          return;
        }

        // Get unique course and lesson IDs
        const courseIds = [...new Set(notesData.map((n) => n.course_id))];
        const lessonIds = [...new Set(notesData.map((n) => n.lesson_id))];

        // Fetch course titles
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);

        if (coursesError) {
          throw coursesError;
        }

        // Fetch lesson titles
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title')
          .in('id', lessonIds);

        if (lessonsError) {
          throw lessonsError;
        }

        // Create lookup maps
        const courseMap = new Map(
          (coursesData || []).map((c) => [c.id, c.title])
        );
        const lessonMap = new Map(
          (lessonsData || []).map((l) => [l.id, l.title])
        );

        // Transform the data into our interface
        const notesWithContext: NoteWithContext[] = notesData.map((note) => ({
          id: note.id,
          snippet_markdown: note.snippet_markdown,
          created_at: note.created_at,
          course_id: note.course_id,
          lesson_id: note.lesson_id,
          course_title: courseMap.get(note.course_id) || 'Unknown Course',
          lesson_title: lessonMap.get(note.lesson_id) || 'Unknown Lesson',
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

  /**
   * Delete a note
   */
  const handleDeleteNote = async (noteId: string) => {
    if (deletingId) return;

    setDeletingId(noteId);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        throw error;
      }

      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
              <p className="font-body text-body-md text-neutral-text-muted">
                Loading notes...
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <h1 className="font-display text-display-lg text-neutral-text mb-6">My Notes</h1>
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-surface rounded-full mb-4">
              <StickyNote className="w-8 h-8 text-neutral-text-muted" />
            </div>
            <p className="font-body text-body-md text-neutral-text-muted">
              No notes yet. Select text in any lesson to save it here!
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="font-display text-display-lg text-neutral-text mb-6">My Notes</h1>

      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id} className="p-4">
            {/* Context metadata - Requirements: 4.4 */}
            <div className="flex items-center gap-4 mb-3 text-sm text-neutral-text-muted">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">{note.course_title}</span>
              </div>
              <span className="text-neutral-border">•</span>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{note.lesson_title}</span>
              </div>
              <span className="text-neutral-border">•</span>
              <span>{formatDate(note.created_at)}</span>
            </div>

            {/* Note content */}
            <div className="bg-neutral-surface rounded-lg p-4 mb-3">
              <p className="font-body text-body-md text-neutral-text whitespace-pre-wrap">
                {note.snippet_markdown}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                to={`/courses/${note.course_id}?lesson=${note.lesson_id}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View in lesson</span>
              </Link>

              <button
                onClick={() => handleDeleteNote(note.id)}
                disabled={deletingId === note.id}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label="Delete note"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingId === note.id ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
