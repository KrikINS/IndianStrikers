import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// API services
import * as api from '../services/chatService';

export default function GlobalChat({ currentUser }: { currentUser: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getChatMessages();
      setMessages(data.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      const sent = await api.sendChatMessage(newMessage);
      setMessages(prev => [...prev, sent.message]);
      setNewMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Floating FAB - Draggable */}
      <motion.button
        drag
        dragConstraints={{ left: -300, right: 0, top: -600, bottom: 0 }}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 200, bounceDamping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        whileDrag={{ scale: 1.15, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
        onClick={() => setIsOpen(!isOpen)}
        title="Open club chat"
        className="fixed bottom-[90px] right-6 z-[60] w-14 h-14 bg-sky-600 hover:bg-sky-500 text-white rounded-full shadow-[0_10px_30px_-5px_rgba(56,189,248,0.5)] flex items-center justify-center transition-colors border-2 border-white/20 touch-none cursor-grab active:cursor-grabbing"
      >
        <MessageCircle size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            className="fixed bottom-[160px] right-4 left-4 md:left-auto md:right-6 z-[70] md:w-[380px] h-[550px] max-h-[80vh] bg-slate-900 border border-white/10 shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden backdrop-blur-3xl shadow-sky-500/10"
          >
            {/* Header */}
            <div className="bg-slate-800/50 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-lg">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Strikers Club Chat</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-sky-400 text-[9px] font-black uppercase tracking-tighter">Live Squad Feed</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={loadMessages}
                  title="Refresh messages"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"
                >
                  <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
            >
              {loading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Loader2 className="animate-spin text-sky-500 mb-2" />
                  <p className="text-[10px] font-black uppercase text-slate-500">Connecting to feed...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                  <MessageCircle size={48} className="mb-4 text-slate-700" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">No messages yet.<br/>Be the first to speak!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = String(msg.user_id) === String(currentUser?.id);
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      {!isMe && <p className="text-[9px] font-black text-slate-500 uppercase mb-1.5 px-1">{msg.user_name}</p>}
                      <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-medium shadow-sm transition-all hover:scale-[1.02] ${
                        isMe 
                          ? 'bg-sky-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[8px] text-slate-600 mt-1.5 px-1 uppercase font-black tracking-tighter italic">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <form onSubmit={handleSend} className="p-6 bg-slate-950/80 border-t border-white/5 flex gap-3 backdrop-blur-2xl">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Talk to the club..."
                maxLength={500}
                className="flex-1 bg-slate-800/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none transition-all placeholder:text-slate-600 font-medium"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || loading}
                title="Send message"
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 w-12 h-12 flex items-center justify-center rounded-2xl text-white transition-all disabled:opacity-50 shadow-lg shadow-sky-600/20 active:scale-90"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
