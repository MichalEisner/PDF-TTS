import { useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void;
}

export const FileUploader = ({ onFilesSelect }: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    if (droppedFiles.length > 0) {
      onFilesSelect(droppedFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(file => file.type === 'application/pdf');
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800/50 rounded-xl shadow-sm border border-primary/10 p-2 mb-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 px-6 py-16 hover:border-primary/40 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          multiple
          className="hidden"
        />
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <UploadCloud className="w-10 h-10" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl font-bold tracking-tight text-center">Sem přetáhněte PDF soubor</p>
          <p className="text-sm opacity-70 text-center">Podporuje PDF soubory do 50 MB</p>
        </div>
        <button className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold tracking-wide shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          Vybrat PDF
        </button>
      </motion.div>
    </div>
  );
};
