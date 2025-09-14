import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useAuth } from './AuthContext';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../../../server/src/schema';

export function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [formData, setFormData] = useState<CreateNoteInput>({
    user_id: user?.id || '',
    title: '',
    content: ''
  });

  const loadNotes = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getUserNotes.query({ user_id: user.id });
      setNotes(result);
      setError('');
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const resetForm = () => {
    setFormData({
      user_id: user?.id || '',
      title: '',
      content: ''
    });
    setEditingNote(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingNote) {
        const updateData: UpdateNoteInput = {
          id: editingNote.id,
          title: formData.title,
          content: formData.content
        };
        await trpc.updateNote.mutate(updateData);
      } else {
        await trpc.createNote.mutate(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
      setError('Failed to save note');
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      user_id: user?.id || '',
      title: note.title,
      content: note.content
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (note: Note) => {
    if (!user || !confirm('Are you sure you want to delete this note?')) return;

    try {
      await trpc.deleteNote.mutate({
        id: note.id,
        user_id: user.id
      });
      loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError('Failed to delete note');
    }
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">📝 Financial Notes</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>➕ Add Note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? '✏️ Edit Note' : '➕ Add New Note'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateNoteInput) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter note title..."
                  required
                />
              </div>
              
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateNoteInput) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Write your financial note here..."
                  className="min-h-32"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingNote ? '💾 Update' : '➕ Create'} Note
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">❌ {error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">No notes yet</h3>
            <p className="text-gray-500 mb-6">
              Start organizing your financial thoughts and ideas by creating your first note.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>➕ Create First Note</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note: Note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold line-clamp-2">
                  {note.title}
                </CardTitle>
                <div className="text-sm text-gray-500">
                  Created: {note.created_at.toLocaleDateString()}
                  {note.updated_at.getTime() !== note.created_at.getTime() && (
                    <span className="block">Updated: {note.updated_at.toLocaleDateString()}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {truncateContent(note.content)}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(note)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(note)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div className="text-center text-gray-500">
          Showing {notes.length} note{notes.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}