import { useState, useEffect, useRef } from 'react';
import { FileUploader } from './components/FileUploader';
import { VoiceSettings } from './components/VoiceSettings';
import { ResultsSection } from './components/ResultsSection';
import { extractTextFromPdf } from './utils/PdfProcessor';
import { TtsEngine } from './utils/TtsEngine';
import { refineTextForTts } from './utils/AiProcessor';
import type { QueuedFile } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { FileText, ShieldCheck } from 'lucide-react';

function App() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speed, setSpeed] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const ttsEngine = useRef<TtsEngine | null>(null);

  useEffect(() => {
    ttsEngine.current = new TtsEngine();
    
    const loadVoices = () => {
      const availableVoices = ttsEngine.current?.getVoices() || [];
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('cs')) || 
                             availableVoices.find(v => v.lang.startsWith('en')) || 
                             availableVoices[0];
        setSelectedVoice(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  const handleFilesSelect = (selectedFiles: File[]) => {
    const newFiles: QueuedFile[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      text: '',
      status: 'ČEKÁ',
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const processQueue = async () => {
    if (isProcessing || files.length === 0) return;
    setIsProcessing(true);

    for (const fileItem of files) {
      if (fileItem.status === 'HOTOVO') continue;

      updateFileStatus(fileItem.id, { status: 'OPTIMALIZUJI', progress: 0 });

      try {
        let text = fileItem.text;
        if (!text) {
          console.log(`App: Extrahuji text z PDF pro soubor ${fileItem.file.name}...`);
          text = await extractTextFromPdf(fileItem.file);
          updateFileStatus(fileItem.id, { text });
        }

        // AI Refinement Step
        console.log(`App: Spouštím AI optimalizaci pro soubor ${fileItem.file.name}...`);
        const optimizedText = await refineTextForTts(text);
        console.log(`App: AI optimalizace dokončena, přecházím na TTS pro soubor ${fileItem.file.name}.`);
        updateFileStatus(fileItem.id, { text: optimizedText, status: 'ZPRACOVÁVÁM' });

        const blob = await ttsEngine.current!.speakAndRecord(optimizedText, selectedVoice, (p) => {
          updateFileStatus(fileItem.id, { progress: Math.round(p * 100) });
        });

        updateFileStatus(fileItem.id, { status: 'HOTOVO', progress: 100, blob });

        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#137fec', '#ffffff']
        });
      } catch (error) {
        console.error('Error processing:', error);
        updateFileStatus(fileItem.id, { status: 'CHYBA' });
      }
    }
    setIsProcessing(false);
  };

  const updateFileStatus = (id: string, updates: Partial<QueuedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDownloadMp3 = (id: string) => {
    const fileItem = files.find(f => f.id === id);
    if (!fileItem?.blob) return;
    const url = URL.createObjectURL(fileItem.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileItem.file.name.replace('.pdf', '')}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pendingFiles = files.filter(f => f.status === 'ČEKÁ' || f.status === 'ZPRACOVÁVÁM').length;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-primary/10 bg-background-light dark:bg-background-dark px-6 md:px-20 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 bg-primary/10 text-primary rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">PDF to Voice</h2>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium opacity-70">
            <span>Fast. Secure. Quality AI Voices.</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto w-full">
          {/* Hero Text */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Turn your documents into <span className="text-primary">audio</span>
            </h1>
            <p className="text-lg opacity-80">Upload your PDF and let our AI read it aloud for you in high quality.</p>
          </motion.div>

          {/* Upload Section */}
          <FileUploader onFilesSelect={handleFilesSelect} />

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full"
              >
                <VoiceSettings 
                  voices={voices}
                  selectedVoice={selectedVoice}
                  onVoiceChange={setSelectedVoice}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  onConvert={processQueue}
                  isProcessing={isProcessing}
                  disabled={isProcessing}
                  canConvert={pendingFiles > 0}
                />
                
                <ResultsSection 
                  files={files}
                  onDelete={handleRemoveFile}
                  onDownload={handleDownloadMp3}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-20 py-8 border-t border-primary/5 w-full text-center">
            <p className="text-sm opacity-50 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Your files are processed securely and deleted after conversion.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
