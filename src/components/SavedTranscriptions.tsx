import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileText, Trash2, Calendar, Loader2, Clock, Pencil, Check, X as XIcon } from 'lucide-react';

interface SavedTranscription {
  id: string;
  fileName: string;
  text: string;
  createdAt: Timestamp;
}

interface SavedTranscriptionsProps {
  userId: string;
  onLoadTranscription: (text: string, fileName: string) => void;
}

export const SavedTranscriptions = ({ userId, onLoadTranscription }: SavedTranscriptionsProps) => {
  const [saved, setSaved] = useState<SavedTranscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'transcriptions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedTranscription[];
      setSaved(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Opravdu chcete tento přepis smazat?')) return;
    try {
      await deleteDoc(doc(db, 'transcriptions', id));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const startEditing = (item: SavedTranscription, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setNewName(item.fileName);
  };

  const handleRename = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      if ('stopPropagation' in e) e.stopPropagation();
      e.preventDefault();
    }
    
    if (!editingId || !newName.trim()) return;

    try {
      await updateDoc(doc(db, 'transcriptions', editingId), {
        fileName: newName.trim()
      });
      setEditingId(null);
    } catch (error) {
      console.error("Rename error:", error);
    }
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="size-8 animate-spin mb-4 text-primary/40" />
        <p className="text-sm font-medium">Načítám vaši historii...</p>
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
        <History className="size-12 mb-4 opacity-20" />
        <p className="text-sm font-medium text-center max-w-[200px]">
          Zatím nemáte žádné uložené přepisy.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          Moje historie
        </h3>
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
          {saved.length} {saved.length === 1 ? 'soubor' : 'soubory'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {saved.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => onLoadTranscription(item.text, item.fileName)}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer overflow-hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-primary/5 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    {!editingId && (
                      <>
                        <button
                          onClick={(e) => startEditing(item, e)}
                          className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === item.id ? (
                  <form 
                    onSubmit={handleRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 mb-2"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-primary border px-2 py-1 rounded-md text-sm font-bold outline-none"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-sm"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </form>
                ) : (
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {item.fileName}
                  </h4>
                )}

                <div className="mt-auto flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Calendar className="size-3" />
                  {item.createdAt ? item.createdAt.toDate().toLocaleDateString('cs-CZ') : 'Právě teď'}
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] transition-colors pointer-events-none" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
