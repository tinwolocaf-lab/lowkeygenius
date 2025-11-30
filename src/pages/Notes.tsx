import { StickyNote } from 'lucide-react';
import { Card } from '../components/Card';

export function Notes() {
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
