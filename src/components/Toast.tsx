/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isError?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Toast({ message, isError = false, isOpen, onClose }: ToastProps) {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border bg-neutral-900/90 text-neutral-100 shadow-xl backdrop-blur-md animate-slide-in max-w-sm">
      <div className={`w-1.5 h-full absolute left-0 top-0 rounded-l-xl ${isError ? 'bg-red-500' : 'bg-zinc-300'}`} />
      
      {isError ? (
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 ml-1" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-zinc-300 shrink-0 ml-1" />
      )}
      
      <p className="text-sm font-medium pr-6 leading-relaxed text-neutral-200">{message}</p>
      
      <button 
        onClick={onClose}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
