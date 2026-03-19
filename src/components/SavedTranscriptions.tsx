import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileText, Trash2, Calendar, Loader2, Clock, Pencil, Check, X as XIcon, Eye, Plus, Save, Download, RotateCcw } from 'lucide-react';
import { TtsEngine } from '../utils/TtsEngine';

interface SavedTranscription {
  id: string;
  fileName: string;
  text: string;
  createdAt: Timestamp;
}

interface SavedTranscriptionsProps {
  userId: string;
  onLoadTranscription: (text: string, fileName: string) => void;
  ttsEngine: TtsEngine | null;
  selectedVoice: string;
}

export const SavedTranscriptions = ({ userId, onLoadTranscription, ttsEngine, selectedVoice }: SavedTranscriptionsProps) => {
  const [saved, setSaved] = useState<SavedTranscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [previewItem, setPreviewItem] = useState<SavedTranscription | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const openPreview = (item: SavedTranscription) => {
    setPreviewItem(item);
    setEditingText(item.text);
    setAudioBlob(null);
    setGenProgress(0);
  };

  const handleSaveContent = async () => {
    if (!previewItem || !editingText.trim() || editingText === previewItem.text) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'transcriptions', previewItem.id), {
        text: editingText
      });
      // Update local state is handled by onSnapshot
      setPreviewItem({ ...previewItem, text: editingText });
    } catch (error) {
      console.error("Save content error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!ttsEngine || !editingText.trim()) return;
    setIsGenerating(true);
    setGenProgress(0);
    try {
      const blob = await ttsEngine.speakAndRecord(editingText, selectedVoice, (p) => {
        setGenProgress(Math.round(p * 100));
      });
      setAudioBlob(blob);
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMp3 = () => {
    if (!audioBlob || !previewItem) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewItem.fileName.replace('.pdf', '')}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
               className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden"
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
                           onClick={(e) => { e.stopPropagation(); openPreview(item); }}
                           title="Náhled a úpravy"
                           className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                         >
                           <Eye className="size-4" />
                         </button>
                         <button
                           onClick={(e) => { e.stopPropagation(); onLoadTranscription(item.text, item.fileName); }}
                           title="Přidat do fronty"
                           className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-all"
                         >
                           <Plus className="size-4" />
                         </button>
                         <button
                           onClick={(e) => startEditing(item, e)}
                           title="Přejmenovat"
                           className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                         >
                           <Pencil className="size-4" />
                         </button>
                         <button
                           onClick={(e) => handleDelete(item.id, e)}
                           title="Smazat"
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

       {/* Preview & Edit Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGenerating && setPreviewItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[80vh] max-h-[900px]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    {previewItem.fileName}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-slate-400 font-medium">
                      {previewItem.createdAt?.toDate().toLocaleDateString('cs-CZ')}
                    </p>
                    {editingText !== previewItem.text && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Změněno
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => !isGenerating && setPreviewItem(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <XIcon className="size-6" />
                </button>
              </div>

              {/* Modal Body - Editable Text Area */}
              <div className="flex-1 p-0 overflow-hidden flex flex-col relative">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  disabled={isGenerating}
                  className="flex-1 w-full p-8 bg-transparent text-slate-600 dark:text-slate-300 leading-relaxed outline-none resize-none font-medium custom-scrollbar focus:bg-slate-50/50 dark:focus:bg-slate-800/10 transition-colors"
                  placeholder="Zde můžete upravit text přepisu..."
                />
                
                {isGenerating && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
                    <Loader2 className="size-12 text-primary animate-spin mb-6" />
                    <h4 className="text-xl font-bold mb-2">Generuji audio...</h4>
                    <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${genProgress}%` }}
                      />
                    </div>
                    <p className="text-sm font-bold text-primary">{genProgress}%</p>
                  </div>
                )}
              </div>

              {/* Modal Footer - Actions */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveContent}
                    disabled={isSaving || isGenerating || editingText === previewItem.text}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-30 disabled:grayscale
                             bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                  >
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Uložit změny
                  </button>
                  
                  {audioBlob ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadMp3}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-500/20"
                      >
                        <Download className="size-4" />
                        Stáhnout MP3
                      </button>
                      <button
                        onClick={handleGenerateAudio}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                        title="Vygenerovat znovu"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateAudio}
                      disabled={isGenerating || !editingText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      <RotateCcw className="size-4" />
                      Generovat Audio
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={() => !isGenerating && setPreviewItem(null)}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Zavřít
                  </button>
                  <button
                    onClick={() => {
                      onLoadTranscription(editingText, previewItem.fileName);
                      setPreviewItem(null);
                    }}
                    disabled={isGenerating}
                    className="px-6 py-2.5 border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <Plus className="size-4" />
                    Přidat do fronty
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
