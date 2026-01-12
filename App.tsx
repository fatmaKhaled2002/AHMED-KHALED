
import React, { useState, useEffect, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { Timeline } from './components/Timeline';
import { ReportDisplay } from './components/ReportDisplay';
import { RegistrationForm } from './components/RegistrationForm';
import { Dashboard } from './components/Dashboard';
import { analyzeDocumentsMetadata, generateMedicalReport } from './services/geminiService';
import { 
    saveDocumentsToStorage, 
    loadDocumentsFromStorage, 
    clearCurrentPatientData, 
    removeDocumentFromStorage, 
    saveReportToStorage, 
    loadReportFromStorage,
    saveProfile,
    getAllProfiles,
    deleteProfileCompletely
} from './services/storageService';
import { AppStep, ProcessedDocument, ReportData, PatientProfile } from './types';
import { Loader2, ArrowRight, LayoutDashboard, RefreshCcw, ArrowLeft, PlusCircle, LogOut, Search, X, Activity, UserCircle } from 'lucide-react';

const STORAGE_KEY_ACTIVE_PROFILE_ID = 'medichronicle_active_id';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.DASHBOARD);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<PatientProfile[]>([]);
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const refreshProfiles = async () => {
    const profiles = await getAllProfiles();
    setAllProfiles(profiles);
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await refreshProfiles();
        const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE_ID);
        
        if (activeId) {
          const profiles = await getAllProfiles();
          const activeProfile = profiles.find(p => p.id === activeId);
          
          if (activeProfile) {
            setProfile(activeProfile);
            const savedDocs = await loadDocumentsFromStorage(activeId);
            const savedReport = await loadReportFromStorage(activeId);
            
            setDocuments(savedDocs);
            if (savedReport) {
                setReport(savedReport);
                setStep(AppStep.RESULT);
            } else if (savedDocs.length > 0) {
                setStep(AppStep.REVIEW);
            } else {
                setStep(AppStep.UPLOAD);
            }
          }
        }
      } catch (err) {
        console.error("Hydration failed", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  const handleProfileComplete = async (newProfile: PatientProfile) => {
    await saveProfile(newProfile);
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE_ID, newProfile.id);
    await refreshProfiles();
    setStep(AppStep.UPLOAD);
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!profile) return;
    setError(null);
    setStep(AppStep.ANALYZING_METADATA);
    setAnalysisProgress({ current: 0, total: files.length });

    try {
      const metaData = await analyzeDocumentsMetadata(files, (current, total) => {
        setAnalysisProgress({ current, total });
      });

      const processed: ProcessedDocument[] = metaData.map((meta, index) => ({
        ...meta,
        file: files[index],
        previewUrl: URL.createObjectURL(files[index])
      }));

      const newDocs = [...documents, ...processed];
      await saveDocumentsToStorage(profile.id, newDocs);
      setDocuments(newDocs);
      setStep(AppStep.REVIEW);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An unexpected error occurred during document analysis.");
      setStep(AppStep.UPLOAD);
    }
  };

  const handleRemoveDocument = async (id: string) => {
    if (!profile) return;
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    await removeDocumentFromStorage(profile.id, id);
  };

  const handleGenerateReport = async () => {
    if (!profile) return;
    setStep(AppStep.GENERATING_REPORT);
    try {
      const reportData = await generateMedicalReport(documents);
      await saveReportToStorage(profile.id, reportData);
      setReport(reportData);
      setStep(AppStep.RESULT);
    } catch (err: any) {
        setError("Synthesis failed. Please ensure your clinical history contains valid data.");
        setStep(AppStep.REVIEW);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_PROFILE_ID);
    setProfile(null);
    setDocuments([]);
    setReport(null);
    setSearchTerm('');
    setStep(AppStep.DASHBOARD);
  };

  const handleSelectPatient = async (p: PatientProfile) => {
    setProfile(p);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE_ID, p.id);
    setIsInitializing(true);
    const savedDocs = await loadDocumentsFromStorage(p.id);
    const savedReport = await loadReportFromStorage(p.id);
    setDocuments(savedDocs);
    setReport(savedReport);
    setIsInitializing(false);

    if (savedReport) setStep(AppStep.RESULT);
    else if (savedDocs.length > 0) setStep(AppStep.REVIEW);
    else setStep(AppStep.UPLOAD);
  };

  const handleDeletePatient = async (id: string) => {
      if (window.confirm("Delete this patient profile and all associated data permanently?")) {
          await deleteProfileCompletely(id);
          if (profile?.id === id) handleLogout();
          await refreshProfiles();
      }
  };

  const handleClearHistory = async () => {
    if (profile && window.confirm("Clear all clinical records for this patient? Profile data will be kept.")) {
        try {
            await clearCurrentPatientData(profile.id);
            setDocuments([]);
            setReport(null);
            setSearchTerm('');
            setError(null);
            setStep(AppStep.UPLOAD);
        } catch (err) {
            console.error("Failed to clear history", err);
            setError("Failed to clear records from storage.");
        }
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const lowerSearch = searchTerm.toLowerCase();
    return documents.filter(doc => 
      doc.summary.toLowerCase().includes(lowerSearch) || 
      doc.file.name.toLowerCase().includes(lowerSearch) ||
      doc.type.toLowerCase().includes(lowerSearch)
    );
  }, [documents, searchTerm]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-medical-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(AppStep.DASHBOARD)}>
            <LayoutDashboard className="w-6 h-6 text-medical-600" />
            <span className="font-black text-xl tracking-tight hidden sm:inline">MediChronicle AI</span>
          </div>
          <div className="flex items-center gap-3">
             {profile ? (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <UserCircle className="w-4 h-4 text-medical-600" />
                    <span className="text-[10px] font-black uppercase text-slate-500">{profile.name}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="text-[10px] font-black uppercase tracking-widest text-medical-600 flex items-center gap-1.5 hover:text-medical-800 transition-all bg-medical-50 px-3 py-1.5 rounded-full shadow-sm active:scale-95"
                  title="Return to Hub / Log out of current profile"
                >
                  <LogOut className="w-3 h-3" /> Logout to Hub
                </button>
              </>
            ) : (
                <button 
                  onClick={() => setStep(AppStep.REGISTRATION)} 
                  className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5 hover:bg-medical-700 transition-all bg-medical-600 px-4 py-2 rounded-full shadow-lg active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" /> New Patient
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl mb-8 font-medium text-sm flex justify-between items-center animate-in slide-in-from-top duration-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl font-bold p-2 leading-none">×</button>
          </div>
        )}

        {step === AppStep.DASHBOARD && (
            <Dashboard 
                profiles={allProfiles} 
                onSelect={handleSelectPatient} 
                onDelete={handleDeletePatient}
                onNew={() => setStep(AppStep.REGISTRATION)}
            />
        )}

        {step === AppStep.REGISTRATION && <RegistrationForm onComplete={handleProfileComplete} onCancel={() => setStep(AppStep.DASHBOARD)} />}
        
        {step === AppStep.UPLOAD && (
          <div className="space-y-6">
            <button 
                onClick={() => setStep(AppStep.DASHBOARD)}
                className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Hub
            </button>
            <FileUpload onFilesSelected={handleFilesSelected} />
          </div>
        )}
        
        {step === AppStep.ANALYZING_METADATA && (
          <div className="text-center py-20 animate-in zoom-in duration-300">
            <div className="relative inline-block mb-10">
                <div className="absolute inset-0 bg-medical-500/10 rounded-full animate-ping scale-150 opacity-20" />
                <div className="relative bg-white p-8 rounded-full shadow-2xl border border-medical-50">
                    <Activity className="w-12 h-12 text-medical-500 animate-pulse" />
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-medical-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg">
                    {Math.round((analysisProgress.current / (analysisProgress.total || 1)) * 100)}%
                </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Advanced OCR Scan (AR/EN)</h3>
            <p className="text-slate-500 text-sm mb-8">Correcting orientation, reading script, and extracting clinical facts...</p>
            
            <div className="max-w-md mx-auto">
                <div className="relative bg-slate-200 h-3 rounded-full overflow-hidden mb-4">
                    <div 
                        className="absolute top-0 left-0 bg-gradient-to-r from-medical-400 via-medical-600 to-medical-400 h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(14,165,233,0.5)] bg-[length:200%_100%] animate-shimmer" 
                        style={{ width: `${(analysisProgress.current / (analysisProgress.total || 1)) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">
                    <span>{analysisProgress.current} / {analysisProgress.total} Files</span>
                </div>
            </div>
          </div>
        )}

        {step === AppStep.REVIEW && (
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Clinical Timeline</h2>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search clinical findings..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 pl-10 pr-10 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-medical-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
              </div>
              <Timeline documents={filteredDocuments} onRemove={handleRemoveDocument} />
            </div>
            <div className="sticky top-24 h-fit">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-2xl ring-1 ring-slate-100">
                <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-4 border-b border-slate-50 pb-4">Profile Insights</h4>
                <div className="space-y-4 mb-10">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Record Count</span>
                        <span className="font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">{documents.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">Patient</span>
                        <span className="font-bold text-medical-600 truncate max-w-[120px]">{profile?.name}</span>
                    </div>
                </div>
                <button 
                  onClick={handleGenerateReport}
                  disabled={documents.length === 0}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50 group"
                >
                  Synthesize Portfolio 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.GENERATING_REPORT && (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-medical-600 mb-6" />
            <h3 className="text-xl font-black text-slate-900">Synthesizing Patient Journey</h3>
            <p className="text-slate-500 mt-2 text-sm">Cross-referencing timelines and extracting trends...</p>
          </div>
        )}

        {step === AppStep.RESULT && report && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(AppStep.REVIEW)}
              className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Timeline
            </button>
            <ReportDisplay report={report} documents={documents} patientName={profile?.name} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
