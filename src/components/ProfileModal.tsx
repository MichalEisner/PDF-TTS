import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile, updatePassword, deleteUser, reauthenticateWithPopup, GoogleAuthProvider, unlink } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { X, User, Lock, Save, AlertCircle, CheckCircle2, Loader2, Camera, Trash2 as TrashIcon } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  customPhotoURL?: string;
}

export const ProfileModal = ({ isOpen, onClose, user, customPhotoURL }: ProfileModalProps) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
  const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Obrázek je příliš velký (max 5MB).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64);
      setPhotoPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Opravdu chcete TRVALE smazat svůj účet a veškerá data? Tato akce je nevratná.')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      await deleteUser(user);
      onClose();
    } catch (error: any) {
      console.error("Account delete error:", error);
      if (error.code === 'auth/requires-recent-login') {
        if (window.confirm('Pro smazání účtu je vyžadováno čerstvé přihlášení. Chcete se znovu přihlásit?')) {
          try {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, provider);
            await deleteUser(user);
            onClose();
          } catch (reAuthError) {
            setMessage({ type: 'error', text: 'Chyba při opětovném přihlášení. Odhlaste se a přihlaste znovu.' });
          }
        }
      } else {
        setMessage({ type: 'error', text: 'Chyba při mazání účtu.' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!window.confirm('Opravdu chcete odpojit svůj Google účet? Budete se moci přihlašovat pouze pomocí e-mailu a hesla.')) {
      return;
    }

    if (!hasPasswordProvider && !newPassword) {
      setMessage({ type: 'error', text: 'Před odpojením Google účtu si musíte nastavit heslo.' });
      return;
    }

    setIsUnlinking(true);
    setMessage(null);

    try {
      // If they don't have a password yet, we must set it first
      if (!hasPasswordProvider) {
        if (newPassword.length < 6) throw new Error('Heslo musí mít alespoň 6 znaků.');
        if (newPassword !== confirmPassword) throw new Error('Hesla se neshodují.');
        await updatePassword(user, newPassword);
      }

      await unlink(user, GoogleAuthProvider.PROVIDER_ID);
      setMessage({ type: 'success', text: 'Google účet byl úspěšně odpojen.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Unlink error:", error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Tato akce vyžaduje čerstvé přihlášení. Odhlaste se a znovu přihlaste.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Chyba při odpojování účtu.' });
      }
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (photoPreview) {
        await setDoc(doc(db, 'users', user.uid), {
          photoURL: photoPreview,
          updatedAt: new Date().toISOString()
        }, { merge: true });
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 pointer-events-auto flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
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

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="relative group">
                    <div className="size-24 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                      {photoPreview || customPhotoURL || user.photoURL ? (
                        <img src={photoPreview || customPhotoURL || user.photoURL || ''} alt="Profile" className="size-full object-cover" />
                      ) : (
                        <User className="size-10" />
                      )}
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="text-white w-6 h-6" />
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </label>
                    </div>
                    {(photoPreview || user.photoURL) && (
                      <button 
                        onClick={() => setPhotoPreview(null)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Odstranit fotku"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">{user.displayName || 'Uživatel'}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

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

                  {isGoogleUser ? (
                    <div className="space-y-4 pt-2">
                       <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                          <p className="text-sm text-blue-700 dark:text-blue-300 font-bold mb-2">Google Přihlášení</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-4 leading-relaxed">
                             Nyní používáte přihlášení přes Google. Pokud chcete přejít na klasické heslo, nastavte si ho níže a poté odpojte Google účet.
                          </p>
                          
                          <div className="space-y-3 mb-4">
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
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
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                                placeholder="Potvrzení hesla"
                                autoComplete="new-password"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleUnlinkGoogle}
                            disabled={isUnlinking}
                            className="w-full py-2.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all disabled:opacity-50"
                          >
                            {isUnlinking ? 'Odpojuji...' : 'Odpojit Google účet'}
                          </button>
                       </div>
                    </div>
                  ) : (
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

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors opacity-70 hover:opacity-100"
                    >
                      <TrashIcon className="w-3.5 h-3.5" /> 
                      {isDeleting ? 'Mažu účet...' : 'Trvale smazat účet a veškerá data'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
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
