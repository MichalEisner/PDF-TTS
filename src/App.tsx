import { useState, useEffect, useRef } from 'react';
import './firebase/firebase'; // Initialize Firebase
import { FileUploader } from './components/FileUploader';
import { VoiceSettings } from './components/VoiceSettings';
import { ResultsSection } from './components/ResultsSection';
import { TranscriptionModal } from './components/TranscriptionModal';
import { ProfileModal } from './components/ProfileModal';
import { AuthModal } from './components/AuthModal';
import { AuthButton } from './components/AuthButton';
import { SavedTranscriptions } from './components/SavedTranscriptions';
import { extractTextFromPdf } from './utils/PdfProcessor';
import { extractTextFromEpub } from './utils/EpubProcessor';
import { TtsEngine } from './utils/TtsEngine';
import { refineTextForTts } from './utils/AiProcessor';
import { TranslatorSection } from './components/TranslatorSection';
import { Languages } from 'lucide-react';
import type { QueuedFile } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { FileText, ShieldCheck } from 'lucide-react';
import { auth, db } from './firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendToCloudBackground } from './utils/CloudProcessor';

function App() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speed, setSpeed] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ photoURL?: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tts' | 'translator'>('tts');
  const [email, setEmail] = useState('');
  
  const ttsEngine = useRef<TtsEngine | null>(null);

  useEffect(() => {
    ttsEngine.current = new TtsEngine();
    
    const loadVoices = () => {
      const availableVoices = ttsEngine.current?.getVoices() || [];
      if (availableVoices.length === 0) return;
      
      setVoices(availableVoices);

      const isPlaceholder = selectedVoice === 'google-cs' || selectedVoice === 'google-en' || !selectedVoice;
      
      if (isPlaceholder) {
        const systemVoice = availableVoices.find(v => v.lang.startsWith('cs') && v.localService) || 
                            availableVoices.find(v => v.lang.startsWith('cs')) ||
                            availableVoices.find(v => v.lang.startsWith('en')) || 
                            availableVoices[0];
        if (systemVoice) {
          setSelectedVoice(systemVoice.voiceURI);
        }
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) {
        setEmail(currentUser.email);
      }
      if (!currentUser) {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data() as { photoURL?: string });
        } else {
          setUserProfile(null);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const updateFileStatus = (id: string, updates: Partial<QueuedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

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
        let metadata: any = null;

        if (!text) {
          const isEpub = fileItem.file.name.toLowerCase().endsWith('.epub') || fileItem.file.type === 'application/epub+zip';
          if (isEpub) {
            const epubData = await extractTextFromEpub(fileItem.file);
            text = epubData.text;
            metadata = epubData.metadata;
          } else {
            text = await extractTextFromPdf(fileItem.file);
          }
          updateFileStatus(fileItem.id, { text });
        }

        const optimizedText = await refineTextForTts(text);
        updateFileStatus(fileItem.id, { text: optimizedText, status: 'ZPRACOVÁVÁM' });

        if (user) {
          try {
            await addDoc(collection(db, 'transcriptions'), {
              userId: user.uid,
              userEmail: user.email,
              fileName: fileItem.file.name,
              text: optimizedText,
              createdAt: serverTimestamp(),
              metadata: {
                ...(metadata || {}),
                originalName: fileItem.file.name
              }
            });
          } catch (saveError) {
            console.error("Error auto-saving to profile:", saveError);
          }
        }

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

  const handleSendQueueToCloud = async () => {
    if (!email || files.length === 0) return;
    
    const pending = files.filter(f => f.status === 'ČEKÁ' || f.status === 'CHYBA');
    if (pending.length === 0) return;

    for (const fileItem of pending) {
      try {
        updateFileStatus(fileItem.id, { status: 'OPTIMALIZUJI' });
        
        let text = fileItem.text;
        let metadata: any = null;

        if (!text) {
          const isEpub = fileItem.file.name.toLowerCase().endsWith('.epub') || fileItem.file.type === 'application/epub+zip';
          if (isEpub) {
            const epubData = await extractTextFromEpub(fileItem.file);
            text = epubData.text;
            metadata = epubData.metadata;
          } else {
            text = await extractTextFromPdf(fileItem.file);
          }
        }

        updateFileStatus(fileItem.id, { status: 'ZPRACOVÁVÁM' });
        
        const success = await sendToCloudBackground({
          text,
          email,
          fileName: fileItem.file.name,
          type: 'TTS',
          author: metadata?.author
        });

        if (success) {
          updateFileStatus(fileItem.id, { status: 'HOTOVO', progress: 100 });
        } else {
          updateFileStatus(fileItem.id, { status: 'CHYBA' });
        }
      } catch (err) {
        console.error("Cloud send error:", err);
        updateFileStatus(fileItem.id, { status: 'CHYBA' });
      }
    }
  };

  const handleTextChange = (id: string, text: string) => {
    updateFileStatus(id, { text });
  };

  const handleRegenerate = async (id: string) => {
    const fileItem = files.find(f => f.id === id);
    if (!fileItem || !ttsEngine.current) return;

    updateFileStatus(id, { status: 'ZPRACOVÁVÁM', progress: 0 });

    try {
      if (user) {
        try {
          await addDoc(collection(db, 'transcriptions'), {
            userId: user.uid,
            userEmail: user.email,
            fileName: fileItem.file.name,
            text: fileItem.text,
            createdAt: serverTimestamp(),
          });
        } catch (saveError) {
          console.error("Error auto-saving to profile:", saveError);
        }
      }

      const blob = await ttsEngine.current.speakAndRecord(fileItem.text, selectedVoice, (p) => {
        updateFileStatus(fileItem.id, { progress: Math.round(p * 100) });
      });

      updateFileStatus(id, { status: 'HOTOVO', progress: 100, blob });

      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.7 },
        colors: ['#137fec', '#ffffff']
      });
    } catch (error) {
      console.error('Error regenerating:', error);
      updateFileStatus(id, { status: 'CHYBA' });
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (editingFileId === id) setEditingFileId(null);
  };

  const handleOpenEdit = (id: string) => {
    setEditingFileId(id);
  };

  const handleDownloadMp3 = (id: string) => {
    const fileItem = files.find(f => f.id === id);
    if (!fileItem?.blob) return;
    const url = URL.createObjectURL(fileItem.blob);
    const a = document.createElement('a');
    a.href = url;
    const downloadName = fileItem.file.name.replace(/\.(pdf|epub)$/i, '') + '.mp3';
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadSaved = (text: string, fileName: string) => {
    const virtualId = Math.random().toString(36).substring(7);
    const newFile: QueuedFile = {
      id: virtualId,
      file: { name: fileName, size: 0 } as any,
      text,
      status: 'HOTOVO',
      progress: 100
    };
    setFiles(prev => [...prev, newFile]);
    setEditingFileId(virtualId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQueueTranslatedForAudio = (text: string, fileName: string) => {
    const virtualId = Math.random().toString(36).substring(7);
    const newFile: QueuedFile = {
      id: virtualId,
      file: { name: `${fileName}.txt`, size: 0 } as any,
      text,
      status: 'ČEKÁ',
      progress: 0
    };
    setFiles(prev => [...prev, newFile]);
    setActiveTab('tts');
    setTimeout(() => {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }, 100);
  };

  const pendingFiles = files.filter(f => f.status === 'ČEKÁ' || f.status === 'ZPRACOVÁVÁM' || f.status === 'OPTIMALIZUJI').length;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between border-b border-primary/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-20 py-4 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">PDF to Voice</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-sm font-medium opacity-70 mr-4">
              <span>Rychlé. Bezpečné. Kvalitní AI hlasy.</span>
            </div>
            <AuthButton 
              onOpenAuth={() => setIsAuthModalOpen(true)} 
              onOpenProfile={() => setIsProfileModalOpen(true)}
              customPhotoURL={userProfile?.photoURL}
            />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-5xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              Poháněno Google Gemini AI
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-primary to-slate-900 dark:from-white dark:via-primary dark:to-white bg-clip-text text-transparent leading-tight">
              Proměňte své dokumenty v <span className="text-primary">audio</span>
            </h1>
            <p className="text-base md:text-lg opacity-60 max-w-2xl mx-auto">
              Transformujte PDF soubory na vysoce kvalitní umělou řeč. Vyčištěno, strukturováno a precizně přečteno pokročilými AI hlasy.
            </p>
          </motion.div>

          <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl mb-12 self-center">
            <button 
              onClick={() => setActiveTab('tts')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'tts' 
                  ? 'bg-white dark:bg-slate-700 shadow-lg text-primary scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Audio Převodník
            </button>
            <button 
              onClick={() => setActiveTab('translator')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'translator' 
                  ? 'bg-white dark:bg-slate-700 shadow-lg text-primary scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Languages className="w-4 h-4" />
              AI Překladač
            </button>
          </div>

          <div className="w-full space-y-12">
            {activeTab === 'tts' ? (
              <>
                <FileUploader onFilesSelect={handleFilesSelect} />

                <AnimatePresence>
                  {files.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                      <div className="lg:col-span-12 xl:col-span-5">
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
                          email={email}
                          onEmailChange={setEmail}
                          onSendToCloud={handleSendQueueToCloud}
                        />
                      </div>
                      
                      <div className="lg:col-span-12 xl:col-span-7">
                        <ResultsSection 
                          files={files}
                          onDelete={handleRemoveFile}
                          onDownload={handleDownloadMp3}
                          onOpenEdit={handleOpenEdit}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <TranslatorSection onQueueForAudio={handleQueueTranslatedForAudio} />
            )}

            {user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-12 border-t border-slate-200 dark:border-slate-800"
              >
                <SavedTranscriptions 
                  userId={user.uid} 
                  onLoadTranscription={handleLoadSaved} 
                  ttsEngine={ttsEngine.current}
                  selectedVoice={selectedVoice}
                />
              </motion.div>
            )}
          </div>

          <footer className="mt-20 py-10 border-t border-primary/5 w-full text-center">
            <p className="text-xs opacity-40 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Vaše data jsou zpracovávána bezpečně přes Google Cloud. Žádné trvalé úložiště, pokud si přepis neuložíte do profilu.
            </p>
          </footer>
        </main>
      </div>

      <TranscriptionModal 
        file={files.find(f => f.id === editingFileId) || null}
        onClose={() => setEditingFileId(null)}
        onTextChange={handleTextChange}
        onRegenerate={handleRegenerate}
        onDownload={handleDownloadMp3}
        onDelete={handleRemoveFile}
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {user && (
        <ProfileModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          customPhotoURL={userProfile?.photoURL}
        />
      )}
    </div>
  );
}

export default App;
