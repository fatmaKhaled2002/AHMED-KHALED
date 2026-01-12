
import React, { useState, useRef, useEffect } from 'react';
import { PatientProfile } from '../types';
import { User, Calendar, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface RegistrationFormProps {
  onComplete: (profile: PatientProfile) => void;
  onCancel?: () => void;
}

const CalendarPicker: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && isOpen) setViewDate(new Date(value));
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1));
  };

  const handleDaySelect = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    onChange(localDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const years = Array.from({ length: 110 }, (_, i) => new Date().getFullYear() - i);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-medical-500 outline-none transition-all flex justify-between items-center cursor-pointer bg-white"
      >
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Select date of birth'}
        </span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-[60] mt-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xl w-[320px] left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0">
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex gap-1">
              <select 
                value={viewDate.getMonth()} 
                onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1))}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer hover:text-medical-600"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select 
                value={viewDate.getFullYear()} 
                onChange={handleYearChange}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer hover:text-medical-600"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={handleNextMonth} type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-300 uppercase py-1">{d}</div>)}
            {Array.from({ length: firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => {
              const day = i + 1;
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === viewDate.getMonth() && new Date(value).getFullYear() === viewDate.getFullYear();
              return (
                <button key={day} type="button" onClick={() => handleDaySelect(day)} className={`py-2 text-xs rounded-lg transition-all ${isSelected ? 'bg-medical-600 text-white font-bold' : 'hover:bg-medical-50 text-slate-700'}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete, onCancel }) => {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob) return;
    onComplete({ 
        id: Math.random().toString(36).substring(2, 15),
        name, 
        dob, 
        gender,
        createdAt: Date.now()
    });
  };

  return (
    <div className="max-w-md mx-auto relative animate-in zoom-in duration-300">
      <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
          {onCancel && (
            <button 
                onClick={onCancel}
                className="absolute right-6 top-6 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
                <X className="w-5 h-5" />
            </button>
          )}
          <div className="text-center mb-10">
            <div className="bg-medical-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <User className="text-medical-600 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">New Patient</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium italic">Create a profile to begin chronological clinical sorting.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Identity</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-medical-50 outline-none transition-all font-bold text-slate-800"
                    placeholder="Enter Patient Name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Birth Date</label>
              <CalendarPicker value={dob} onChange={setDob} />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Clinical Gender</label>
              <div className="grid grid-cols-3 gap-3">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g as any)}
                    className={`py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      gender === g 
                        ? 'bg-medical-600 border-medical-600 text-white shadow-xl scale-[1.05]' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-medical-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-2xl active:scale-95 mt-4"
            >
              Start Timeline Sorting
            </button>
          </form>
      </div>
    </div>
  );
};
