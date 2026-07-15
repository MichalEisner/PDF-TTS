export interface QueuedFile {
  id: string;
  file: File;
  text: string;
  status: 'ČEKÁ' | 'OPTIMALIZUJI' | 'ZPRACOVÁVÁM' | 'HOTOVO' | 'CHYBA';
  progress: number;
  blob?: Blob;
  metadata?: {
    title?: string;
    author?: string;
    originalName?: string;
  };
  emailDestination?: string;
}
