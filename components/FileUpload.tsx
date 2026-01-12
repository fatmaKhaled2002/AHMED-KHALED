
import React, { useCallback } from 'react';
import { Upload, FileText, FileImage } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

const SUPPORTED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected }) => {
  const handleFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    const files = Array.from(incomingFiles).filter((file: File) => SUPPORTED_TYPES.includes(file.type));
    if (files.length > 0) onFilesSelected(files);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [onFilesSelected]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [onFilesSelected]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
      className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer group bg-white shadow-sm"
    >
      <input
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        <div className="bg-medical-50 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-medical-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Upload Medical Documents</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
          Drag and drop photos, PDFs, or Word documents of your labs, imaging, or prescriptions.
        </p>
        <span className="bg-medical-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-medical-500 transition-colors shadow-md">
            Select Files
        </span>
        <div className="mt-4 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> Images</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF / Word</span>
        </div>
      </label>
    </div>
  );
};
