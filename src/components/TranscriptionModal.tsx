import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Download, Trash2, FileText, FileDown } from 'lucide-react';
import { exportToPdf, exportToEpub } from '../utils/DocumentExporter';
import type { QueuedFile } from '../types';

interface TranscriptionModalProps {
  file: QueuedFile | null;
  onClose: () => void;
  onTextChange: (id: string, text: string) => void;
  onRegenerate: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TranscriptionModal = ({ 
  file, 
  onClose, 
  onTextChange, 
  onRegenerate, 
  onDownload, 
  onDelete
}: TranscriptionModalProps) => {
  if (!file) return null;

  const isProcessing = file.status === 'ZPRACOVÁVÁM' || file.status === 'OPTIMALIZUJI';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[300px]">
                  {file.file.name}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                  {file.status === 'HOTOVO' ? 'Přepis připraven' : 
                   file.status === 'ZPRACOVÁVÁM' ? `Zpracovávám... ${file.progress}%` : 
                   file.status === 'CHYBA' ? 'Chyba přepisu' : 'Analyzuji soubor'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 opacity-50" />
              </button>
            </div>
          </div>

          {/* Progress Bar (if active) */}
          {(file.status === 'ZPRACOVÁVÁM' || file.status === 'OPTIMALIZUJI') && (
            <div className="w-full h-1.5 bg-primary/10 overflow-hidden">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_15px_rgba(19,127,236,0.6)]"
                initial={{ width: 0 }}
                animate={{ width: file.status === 'OPTIMALIZUJI' ? '100%' : `${file.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                Zpracovaný přepis
              </label>
              <button 
                onClick={() => onRegenerate(file.id)}
                disabled={isProcessing || !file.text}
                className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-30 transition-all px-3 py-1.5 rounded-lg hover:bg-primary/5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Znovu vygenerovat audio
              </button>
            </div>

            <textarea 
              value={file.text}
              onChange={(e) => onTextChange(file.id, e.target.value)}
              disabled={isProcessing}
              className="w-full h-96 p-5 text-sm bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none leading-relaxed text-slate-700 dark:text-slate-200 font-medium"
              placeholder="Váš přepis se zde objeví po AI analýze..."
            />
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <button 
              onClick={() => { onDelete(file.id); onClose(); }}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-30 text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" /> Odstranit soubor
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={isProcessing}
                onClick={() => exportToPdf(file.text, file.file.name)}
                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all disabled:opacity-30 text-xs font-bold"
              >
                <FileDown className="w-4 h-4" /> PDF
              </button>
              <button 
                disabled={isProcessing}
                onClick={() => exportToEpub(file.text, file.file.name, file.metadata?.author)}
                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all disabled:opacity-30 text-xs font-bold"
              >
                <FileDown className="w-4 h-4" /> EPUB
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                Zavřít
              </button>
              {file.status === 'HOTOVO' && (
                <button 
                  onClick={() => onDownload(file.id)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl transition-all text-sm font-bold shadow-lg shadow-primary/20"
                >
                  <Download className="w-4 h-4" /> Stáhnout MP3
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
