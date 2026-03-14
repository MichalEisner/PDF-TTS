import { Download, Trash2, PlayCircle, Music, FileCheck, AlertCircle, AudioLines, Sparkles } from 'lucide-react';
import type { QueuedFile } from '../types';

interface ResultsSectionProps {
  files: QueuedFile[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

export const ResultsSection = ({ files, onDelete, onDownload }: ResultsSectionProps) => {
  return (
    <div className="flex flex-col gap-6 bg-white dark:bg-slate-800/50 p-8 rounded-xl border border-primary/10 h-full">
      <div className="flex items-center gap-2 mb-2">
        <PlayCircle className="text-primary w-5 h-5" />
        <h3 className="text-lg font-bold">Your Audio Queue</h3>
      </div>
      
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-2">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center opacity-40 py-12">
            <Music className="w-12 h-12" />
            <p className="text-sm font-medium">No files in queue.<br/>Upload PDFs to start.</p>
          </div>
        ) : (
          files.map((file) => (
            <div 
              key={file.id} 
              className={`p-4 rounded-lg border transition-all ${
                file.status === 'ZPRACOVÁVÁM' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                  : 'border-primary/5 bg-background-light/50 dark:bg-background-dark/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary truncate max-w-[180px]">
                    {file.file.name}
                  </span>
                  <span className="text-[10px] opacity-60">
                    {file.status === 'HOTOVO' ? 'Converted • Processed' : 
                     file.status === 'ZPRACOVÁVÁM' ? `Processing • ${file.progress}%` : 
                     file.status === 'CHYBA' ? 'Error occurred' : 'In Queue'}
                  </span>
                </div>
                {file.status === 'OPTIMALIZUJI' ? (
                   <span className="flex items-center justify-center text-primary animate-pulse">
                     <Sparkles className="w-6 h-6" />
                   </span>
                ) : file.status === 'ZPRACOVÁVÁM' ? (
                   <span className="flex items-center justify-center text-primary animate-pulse">
                     <AudioLines className="w-6 h-6" />
                   </span>
                ) : file.status === 'HOTOVO' ? (
                   <FileCheck className="text-green-500 w-6 h-6" />
                ) : file.status === 'CHYBA' ? (
                   <AlertCircle className="text-red-500 w-6 h-6" />
                ) : (
                   <div className="w-6 h-6 bg-slate-100 rounded-full"></div>
                )}
              </div>

              {(file.status === 'ZPRACOVÁVÁM' || file.status === 'OPTIMALIZUJI') && (
                <div className="w-full h-1 bg-primary/10 rounded-full mb-3 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: file.status === 'OPTIMALIZUJI' ? '100%' : `${file.progress}%` }}
                  ></div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-2">
                {file.status === 'HOTOVO' ? (
                  <button 
                    onClick={() => onDownload(file.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-all text-[10px] font-bold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                ) : (
                  <button 
                    onClick={() => onDelete(file.id)}
                    disabled={file.status === 'ZPRACOVÁVÁM'}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {files.some(f => f.status === 'HOTOVO') && (
        <p className="text-[10px] opacity-50 text-center">
          Downloads are ready for your processed documents.
        </p>
      )}
    </div>
  );
};
