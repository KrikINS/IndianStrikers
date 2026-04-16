import React, { useState, useEffect } from 'react';
import { CommentaryTemplate, CommentaryEventType } from '../types';
import { Plus, Trash2, Edit2, MessageSquare, X, Check, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CommentaryManager: React.FC = () => {
  const [templates, setTemplates] = useState<CommentaryTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<CommentaryTemplate>>({
    event_type: 'FOUR',
    text: '',
    is_active: true
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/commentary/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this dialogue template?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/commentary/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
        }
      });
      if (res.ok) {
        toast.success("Template deleted");
        fetchTemplates();
      }
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/commentary/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success("Commentary template added!");
        setIsModalOpen(false);
        setForm({ event_type: 'FOUR', text: '', is_active: true });
        fetchTemplates();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch (err) {
      toast.error("Connection error");
    }
  };

  const categories: CommentaryEventType[] = ['FOUR', 'SIX', 'WICKET', 'DOT', 'MILESTONE'];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center p-6 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center border border-white/20 shadow-lg shadow-orange-900/20">
            <MessageSquare size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-black text-white uppercase tracking-wider leading-none">Commentary Control Panel</h2>
            <p className="text-[12px] text-white/40 mt-1.5 font-medium">Manage randomized play-by-play dialogues for the Scorer.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-[12px] flex items-center gap-2 shadow-lg shadow-amber-900/30 transition-all active:scale-95 uppercase tracking-widest border border-white/10"
        >
          <Plus size={16} /> NEW DIALOGUE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map(cat => (
          <div key={cat} className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 bg-white/[0.03] border-b border-white/5 flex justify-between items-center">
              <h3 className="text-[12px] font-black text-amber-500 uppercase tracking-[0.2em]">{cat}S</h3>
              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-white/40 border border-white/5">
                {templates.filter(t => t.event_type === cat).length} VARIATIONS
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {templates.filter(t => t.event_type === cat).map(t => (
                <div key={t.id} className="group flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl border border-white/5 transition-all">
                  <div className="flex-1">
                    <p className="text-[13px] text-white/80 font-medium leading-relaxed italic">"{t.text}"</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Delete dialogue template"
                    aria-label="Delete dialogue template"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {templates.filter(t => t.event_type === cat).length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-[12px] text-white/20 font-bold uppercase tracking-widest italic">No {cat} templates found</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_-20px_rgba(245,158,11,0.3)] animate-scale-in">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <Plus size={20} className="text-amber-500" />
                </div>
                <h3 className="text-[16px] font-black uppercase tracking-[0.15em] text-white">Create Template</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                title="Close modal"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[11px] font-black text-white/40 uppercase tracking-widest mb-2 px-1">Trigger Event</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm({...form, event_type: cat})}
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                        form.event_type === cat 
                        ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-900/40' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      } uppercase tracking-widest`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-white/40 uppercase tracking-widest mb-2 px-1">Dialogue Text</label>
                <textarea 
                  required 
                  rows={3}
                  value={form.text} 
                  placeholder="e.g. Crunched through the covers for four!"
                  onChange={e => setForm({...form, text: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-[14px] outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-white/10 leading-relaxed font-medium" 
                />
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-2xl shadow-amber-900/50 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-[13px] border border-white/10 flex items-center justify-center gap-3"
                >
                  <Save size={18} /> SAVE TEMPLATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentaryManager;
