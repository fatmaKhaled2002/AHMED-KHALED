
import React from 'react';
import { PatientProfile } from '../types';
import { User, Plus, Trash2, Calendar, Clock, History, ChevronRight, LayoutDashboard, FileText } from 'lucide-react';

interface DashboardProps {
  profiles: PatientProfile[];
  onSelect: (profile: PatientProfile) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profiles, onSelect, onDelete, onNew }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 pb-10">
        <div>
          <div className="flex items-center gap-3 text-medical-600 mb-2">
            <History className="w-8 h-8" />
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Case Hub</h1>
          </div>
          <p className="text-slate-500 font-medium">Manage patient portfolios, review generated reports, or initiate new clinical cases.</p>
        </div>
        <button 
          onClick={onNew}
          className="bg-medical-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-medical-500 transition-all shadow-xl active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" /> Add Patient Case
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Patient Records Yet</h3>
            <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">Digitize your medical history by creating your first patient profile and uploading documents.</p>
            <button 
                onClick={onNew}
                className="mt-8 text-medical-600 font-black text-[10px] uppercase tracking-widest hover:bg-medical-50 px-6 py-2 rounded-full border border-medical-200 transition-all"
            >
                Create New Profile
            </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {profiles.sort((a,b) => b.createdAt - a.createdAt).map((profile) => (
            <div 
              key={profile.id}
              className="group relative bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all cursor-pointer ring-1 ring-slate-100 flex flex-col"
              onClick={() => onSelect(profile)}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-medical-50 rounded-2xl flex items-center justify-center text-medical-600 group-hover:bg-medical-600 group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Permanently delete patient data"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-900 group-hover:text-medical-600 transition-colors mb-4">{profile.name}</h3>
              
              <div className="space-y-2 text-sm text-slate-500 font-medium flex-grow">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>DOB: {new Date(profile.dob).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Case Opened: {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-medical-600 transition-colors">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Access Case</span>
                </div>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
