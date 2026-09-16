import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading data...', size = 'default' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <Loader2 className={`animate-spin text-teal-600 ${size === 'small' ? 'w-5 h-5' : 'w-8 h-8'}`} />
      {text && <span className="text-xs font-medium text-slate-500">{text}</span>}
    </div>
  );
}
