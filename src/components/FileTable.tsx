import { Trash2, Download, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import type { QueuedFile } from '../types';

interface FileTableProps {
  files: QueuedFile[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

export const FileTable = ({ files, onDelete, onDownload }: FileTableProps) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-primary/10 text-primary rounded-md flex items-center justify-center">
            <FileText size={14} />
          </span>
          Fronta ke zpracování ({files.length})
        </h3>
      </div>
      
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Název souboru</th>
              <th>Velikost</th>
              <th>Stav</th>
              <th className="text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="font-semibold text-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <span className="truncate max-w-[200px]">{file.file.name}</span>
                  </div>
                </td>
                <td className="text-slate-500">
                  {(file.file.size / (1024 * 1024)).toFixed(1)} MB
                </td>
                <td>
                  {file.status === 'ČEKÁ' && (
                    <span className="badge badge-pending">ČEKÁ</span>
                  )}
                  {file.status === 'HOTOVO' && (
                    <span className="badge badge-done flex items-center gap-1 w-fit">
                      <CheckCircle2 size={12} /> HOTOVO
                    </span>
                  )}
                  {file.status === 'CHYBA' && (
                    <span className="badge bg-red-50 text-red-500">CHYBA</span>
                  )}
                  {file.status === 'ZPRACOVÁVÁM' && (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={14} />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-primary uppercase">{file.progress}%</span>
                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300" 
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {file.status === 'HOTOVO' ? (
                      <button 
                         onClick={() => onDownload(file.id)}
                         className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-all"
                         title="Stáhnout MP3"
                      >
                        <Download size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => onDelete(file.id)}
                        disabled={file.status === 'ZPRACOVÁVÁM'}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                        title="Odebrat z fronty"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
