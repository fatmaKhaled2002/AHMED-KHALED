
import React from 'react';
import { ProcessedDocument } from '../types';
import { Calendar, FileText, Beaker, Stethoscope, Pill, AlertTriangle, Trash2, File as FileIcon } from 'lucide-react';

interface TimelineProps {
  documents: ProcessedDocument[];
  onRemove: (id: string) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'LAB': return <Beaker className="w-4 h-4" />;
    case 'PRESCRIPTION': return <Pill className="w-4 h-4" />;
    case 'IMAGING': return <FileText className="w-4 h-4" />;
    default: return <Stethoscope className="w-4 h-4" />;
  }
};

export const Timeline: React.FC<TimelineProps> = ({ documents, onRemove }) => {
  const hasDuplicates = documents.some(d => d.isDuplicate && d.type !== 'IMAGING');

  return (
    <div className="space-y-6">
      {hasDuplicates && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
                <p className="text-amber-800 font-bold text-sm uppercase tracking-tight">Review Duplicates</p>
                <p className="text-xs text-amber-700">Possible duplicate records detected. Imaging series remain fully accessible.</p>
            </div>
        </div>
      )}

      <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-8">
        {documents.length === 0 && <p className="text-slate-500 ml-6 italic">Waiting for uploads...</p>}
        
        {documents.map((doc) => (
          <div key={doc.id} className={`relative ml-6 ${doc.isDuplicate && doc.type !== 'IMAGING' ? 'opacity-50 grayscale' : ''}`}>
            <div className={`absolute -left-[31px] top-4 w-4 h-4 rounded-full border-2 border-white ${doc.date ? 'bg-medical-500' : 'bg-slate-300'} shadow-md`}></div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all flex gap-4 flex-col md:flex-row items-start group">
                {/* Standardization: Vertical/Portrait Oriented Preview */}
                <div className="relative w-full md:w-32 aspect-[3/4] bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-[1.02]">
                    {doc.file.type === 'application/pdf' ? (
                        <div className="flex flex-col items-center text-slate-300">
                            <FileIcon className="w-12 h-12" />
                            <span className="text-[10px] uppercase font-black mt-2 tracking-tighter text-slate-400">PDF REPORT</span>
                        </div>
                    ) : doc.file.type.includes('word') || doc.file.type.includes('msword') ? (
                        <div className="flex flex-col items-center text-blue-200">
                            <FileIcon className="w-12 h-12" />
                            <span className="text-[10px] uppercase font-black mt-2 tracking-tighter text-blue-300">DOCX FILE</span>
                        </div>
                    ) : (
                        <img src={doc.previewUrl} alt="Record" className="w-full h-full object-cover bg-white" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5
                                ${doc.type === 'LAB' ? 'bg-blue-100 text-blue-700' : 
                                  doc.type === 'IMAGING' ? 'bg-purple-100 text-purple-700' : 
                                  doc.type === 'PRESCRIPTION' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                {getTypeIcon(doc.type)}
                                {doc.type}
                            </span>
                            {doc.isDuplicate && doc.type !== 'IMAGING' && <span className="text-[9px] font-bold text-amber-600 border border-amber-200 px-1.5 rounded uppercase">Duplicate</span>}
                        </div>
                        <button 
                            onClick={() => onRemove(doc.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1 bg-slate-50 hover:bg-red-50 rounded-lg"
                            title="Remove"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <h4 className="text-slate-900 font-bold text-base pr-4">
                        {doc.date ? new Date(doc.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                    </h4>
                    
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-3">
                        {doc.summary}
                    </p>
                    
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-medium italic">
                        <FileIcon className="w-3 h-3" /> {doc.file.name}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
