import React, { useState } from 'react';
import { Shield, Mail, Info, X } from 'lucide-react';

const PublicFooter: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'contact' | null>(null);

  const Modal = ({ title, content, onClose }: { title: string; content: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 p-6 flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Shield className="text-blue-400" size={24} /> {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" title="Close">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto text-slate-600 leading-relaxed font-medium">
          {content}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <footer className="w-full py-8 mt-12 border-t border-slate-200/60 bg-white/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Official Management Portal
          </p>
          <p className="text-sm font-bold text-slate-600">
            © {new Date().getFullYear()} Indian Strikers Cricket Club
          </p>
        </div>

        <div className="flex items-center gap-8">
          <button 
            onClick={() => setActiveModal('privacy')}
            className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <Shield size={14} /> Privacy Policy
          </button>
          <button 
            onClick={() => setActiveModal('contact')}
            className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <Mail size={14} /> Contact Support
          </button>
        </div>
      </div>

      {activeModal === 'privacy' && (
        <Modal 
          title="Privacy Policy"
          onClose={() => setActiveModal(null)}
          content={
            <div className="space-y-6">
              <section>
                <h4 className="text-slate-900 font-black uppercase text-sm mb-2">Data Protection</h4>
                <p>This portal is an internal management tool for the Indian Strikers. We collect and store member data (name, contact, performance stats) solely for team administration and live scoring purposes.</p>
              </section>
              <section>
                <h4 className="text-slate-900 font-black uppercase text-sm mb-2">Secure Access</h4>
                <p>Authentication is handled via secure tokens. We do not share your personal information with third-party advertisers or external organizations.</p>
              </section>
              <section>
                <h4 className="text-slate-900 font-black uppercase text-sm mb-2">Cookie Usage</h4>
                <p>We use session cookies and local storage to maintain your login state and cache team data for performance. These are strictly functional and do not track you outside of this domain.</p>
              </section>
            </div>
          }
        />
      )}

      {activeModal === 'contact' && (
        <Modal 
          title="Contact Support"
          onClose={() => setActiveModal(null)}
          content={
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Mail className="text-blue-600" size={32} />
              </div>
              <p className="text-lg font-bold text-slate-800">Need help with your account?</p>
              <p>For access issues, password resets, or technical glitches, please reach out to the Team Administrator via the official WhatsApp group or email:</p>
              <a href="mailto:admin@indianstrikers.club" className="text-2xl font-black text-blue-600 hover:underline">
                admin@indianstrikers.club
              </a>
              <p className="text-sm text-slate-400 italic mt-8 font-medium">Please allow 24-48 hours for a response to technical queries.</p>
            </div>
          }
        />
      )}
    </footer>
  );
};

export default PublicFooter;
