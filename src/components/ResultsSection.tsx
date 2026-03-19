import { Download, Trash2, PlayCircle, Music, FileCheck, AudioLines, Sparkles, FileText, Settings2 } from 'lucide-react';
import type { QueuedFile } from '../types';

interface ResultsSectionProps {
  files: QueuedFile[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onOpenEdit: (id: string) => void;
}

export const ResultsSection = ({ 
  files, 
  onDelete, 
  onDownload, 
  onOpenEdit 
}: ResultsSectionProps) => {
  return (
    <div className="flex flex-col gap-6 bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-xl border border-primary/10 h-full max-h-[600px]">
      <div className="flex items-center gap-2 mb-2">
        <PlayCircle className="text-primary w-5 h-5" />
        <h3 className="text-lg font-bold">Your Audio Queue</h3>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center opacity-40 py-12">
            <Music className="w-12 h-12" />
            <p className="text-sm font-medium">No files in queue.<br/>Upload PDFs to start.</p>
          </div>
        ) : (
          files.map((file) => (
            <div 
              key={file.id} 
              className={`group relative rounded-xl border transition-all overflow-hidden ${
                file.status === 'ZPRACOVÁVÁM' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                  : 'border-primary/5 bg-slate-50 dark:bg-slate-900/40 hover:border-primary/20 hover:shadow-md'
              }`}
            >
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => onOpenEdit(file.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-2.5 rounded-xl transition-colors ${
                    file.status === 'HOTOVO' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[140px] md:max-w-[200px]">
                      {file.file.name}
                    </span>
                    <span className="text-[10px] font-bold opacity-50 flex items-center gap-1.5 mt-0.5">
                      {file.status === 'HOTOVO' && <span className="text-green-500">READY</span>}
                      {file.status === 'ZPRACOVÁVÁM' && <span className="text-primary animate-pulse">GENERATING {file.progress}%</span>}
                      {file.status === 'OPTIMALIZUJI' && <span className="text-primary animate-pulse">AI ANALYZING...</span>}
                      {file.status === 'ČEKÁ' && <span>IN QUEUE</span>}
                      {file.status === 'CHYBA' && <span className="text-red-500 uppercase tracking-tighter">ERROR</span>}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenEdit(file.id); }}
                      className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-all"
                      title="Edit Transcription"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    {file.status === 'HOTOVO' ? (
                      <button 
                         onClick={(e) => { e.stopPropagation(); onDownload(file.id); }}
                         className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-all"
                      >
                         <Download className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                        disabled={file.status === 'ZPRACOVÁVÁM'}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-center w-8">
                    {file.status === 'OPTIMALIZUJI' ? (
                       <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    ) : file.status === 'ZPRACOVÁVÁM' ? (
                       <AudioLines className="w-5 h-5 text-primary animate-pulse" />
                    ) : file.status === 'HOTOVO' ? (
                       <FileCheck className="text-green-500 w-5 h-5" />
                    ) : (
                       <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>
                </div>
              </div>

              {(file.status === 'ZPRACOVÁVÁM' || file.status === 'OPTIMALIZUJI') && (
                <div className="px-4 pb-0.5">
                  <div className="w-full h-1 bg-primary/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(19,127,236,0.3)]" 
                      style={{ width: file.status === 'OPTIMALIZUJI' ? '100%' : `${file.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {files.length > 0 && (
        <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase opacity-30 tracking-widest leading-none">
            Click any file to edit
          </p>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-primary/5">
             <div className="size-1 rounded-full bg-green-500" />
             <span className="text-[9px] font-medium opacity-60">System Ready</span>
          </div>
        </div>
      )}
    </div>
  );
};
