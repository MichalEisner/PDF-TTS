import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { updateProfile, updatePassword } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
}

export const ProfileModal = ({ isOpen, onClose, user }: ProfileModalProps) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (newPassword && !isGoogleUser) {
        if (newPassword !== confirmPassword) {
          throw new Error('Hesla se neshodují.');
        }
        if (newPassword.length < 6) {
          throw new Error('Heslo musí mít alespoň 6 znaků.');
        }
        await updatePassword(user, newPassword);
      }

      setMessage({ type: 'success', text: 'Profil byl úspěšně aktualizován!' });
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);

    } catch (error: any) {
      console.error("Profile update error:", error);
      let errorText = 'Chyba při aktualizaci profilu.';
      if (error.code === 'auth/requires-recent-login') {
        errorText = 'Změna hesla vyžaduje čerstvé přihlášení. Prosím, odhlaste se a znovu přihlaste.';
      } else if (error.message) {
        errorText = error.message;
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', pointerEvents: 'none' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 pointer-events-auto flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Můj Profil</h3>
                </div>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 opacity-50" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="space-y-5 pb-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-widest px-1">E-mail</label>
                    <div className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 text-sm">
                      {user.email}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-widest px-1">Přezdívka</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                        placeholder="Tvoje jméno..."
                      />
                    </div>
                  </div>

                  {!isGoogleUser ? (
                    <div className="space-y-4 pt-2">
                      <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />
                      <label className="text-xs font-bold uppercase text-slate-400 tracking-widest px-1">Změna hesla</label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                            placeholder="Nové heslo"
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                            placeholder="Potvrzení hesla"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                       <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          Přihlášeno přes Google. Heslo můžeš změnit ve svém Google účtu.
                       </p>
                    </div>
                  )}

                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${
                          message.type === 'success' 
                          ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' 
                          : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                        }`}
                      >
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const form = document.getElementById('profile-form-internal-submit') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Uložit změny
                    </>
                  )}
                </button>
              </div>
              <form id="profile-form-internal-submit" onSubmit={handleSubmit} className="hidden" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
