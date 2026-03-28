import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export const IngestForm = ({ onIngest, loading, isDark }) => {
  const fileRef  = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      alert('Only CSV files are supported for file upload');
      return;
    }
    onIngest('csv', file);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border border-dashed rounded p-4 text-center cursor-pointer transition-all duration-200 font-mono text-xs',
          drag
            ? 'border-cyan-400 bg-cyan-500/10 text-cyan-400'
            : isDark
              ? 'border-slate-700 text-slate-500 hover:border-slate-500'
              : 'border-slate-300 text-slate-400 hover:border-slate-400'
        )}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
          : <Upload className="w-4 h-4 mx-auto mb-1 opacity-50" />
        }
        {loading ? 'Ingesting...' : 'Drop CSV or click to upload'}
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    </div>
  );
};