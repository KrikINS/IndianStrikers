
import React, { useState, useEffect } from 'react';
import { Play, Image as ImageIcon, Plus, X, Maximize2, Heart, Film, Calendar, Trash2, MessageCircle, Send, User } from 'lucide-react';
import { UserRole } from '../types';

interface Comment {
  id: string;
  text: string;
  authorName: string;
  timestamp: string;
  authorRole?: UserRole; // Optional to show badges
}

import { getMemories, deleteMemory, addMemory, updateMemory, Memory } from '../services/storageService';

interface MemoriesProps {
  userRole: UserRole;
  currentUser?: { name: string; username: string; id?: string };
}

const Memories: React.FC<MemoriesProps> = ({ userRole, currentUser }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Add Memory State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newType, setNewType] = useState<'image' | 'video'>('image');
  const [newCaption, setNewCaption] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // New Comment Form
  const [newComment, setNewComment] = useState('');

  const isAdmin = userRole === 'admin';
  const canComment = userRole === 'admin' || userRole === 'member';
  const canDelete = userRole === 'admin';
  // const canAdd = userRole === 'admin' || userRole === 'member'; // Assuming logic for add button visibility

  useEffect(() => {
    getMemories().then(setMemories).catch(console.error);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this memory?')) {
      try {
        await deleteMemory(id);
        setMemories(prev => prev.filter(m => m.id !== id));
      } catch (e) {
        alert('Failed to delete memory');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:4001/api/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` }
      });
      const data = await res.json();
      if (data.url) setNewUrl(data.url);
      else alert('Upload failed: ' + (data.error || 'Unknown error'));
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e instanceof Error ? e.message : 'Network error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    try {
      const memoryData = {
        type: newType,
        url: newUrl,
        caption: newCaption,
        date: new Date().toISOString().split('T')[0],
        likes: 0,
        width: 'col-span-1 row-span-1', // Default size
        comments: []
      };

      const savedMemory = await addMemory(memoryData);
      setMemories(prev => [savedMemory, ...prev]);
      setIsAddModalOpen(false);
      setNewUrl('');
      setNewCaption('');
    } catch (e) {
      alert('Failed to add memory');
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedMemory) return;

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment,
      authorName: currentUser?.name || 'Anonymous Member',
      authorRole: userRole,
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(selectedMemory.comments || []), comment];

    try {
      await updateMemory(selectedMemory.id, { comments: updatedComments });

      const updatedMemory = { ...selectedMemory, comments: updatedComments };

      setMemories(memories.map(m => m.id === selectedMemory.id ? updatedMemory : m));
      setSelectedMemory(updatedMemory);
      setNewComment('');
    } catch (e) {
      console.error(e);
      alert('Failed to post comment');
    }
  };

  const handleLike = async () => {
    if (!selectedMemory) return;
    const newLikes = (selectedMemory.likes || 0) + 1;

    try {
      await updateMemory(selectedMemory.id, { likes: newLikes });

      const updatedMemory = { ...selectedMemory, likes: newLikes };
      setMemories(memories.map(m => m.id === selectedMemory.id ? updatedMemory : m));
      setSelectedMemory(updatedMemory);
    } catch (e) {
      console.error(e);
      alert('Failed to like post');
    }
  };

  const filteredMemories = memories.filter(m => filter === 'all' || m.type === filter);

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      {/* Standardized Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-2">
            <Film className="text-blue-600" size={28} /> Team Memories
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">Reliving the glory days, one frame at a time.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Filter standard block */}
          <div className="flex flex-1 md:flex-none p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {['all', 'image', 'video'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`flex-1 px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-white hover:bg-blue-600/30 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {(isAdmin || canComment) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Add Memory"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
        {filteredMemories.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setSelectedMemory(item)}
            className={`
              group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-slate-100 bg-slate-200
              ${item.width || 'col-span-1 row-span-1'}
              ${(idx % 5 === 0 && !item.width) ? 'md:col-span-2 md:row-span-2' : ''} 
            `}
          >
            <img
              src={item.url}
              alt={item.caption}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center justify-between text-white mb-2">
                  <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    {item.type === 'video' ? <Film size={10} /> : <ImageIcon size={10} />} {item.type}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold">
                    <Heart size={12} className="fill-white" /> {item.likes}
                  </span>
                </div>
                <h3 className="text-white font-bold leading-tight">{item.caption}</h3>
                <p className="text-slate-300 text-xs mt-1 flex items-center gap-1">
                  <Calendar size={10} /> {new Date(item.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/50 group-hover:scale-110 transition-transform">
                  <Play size={20} className="text-white ml-1 fill-white" />
                </div>
              </div>
            )}

            {/* Admin Delete Button */}
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Delete Memory"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <button
            onClick={() => setSelectedMemory(null)}
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 bg-white/10 rounded-full"
            title="Close"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row gap-6 bg-black/50 rounded-3xl overflow-hidden border border-white/10">
            {/* Media */}
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[400px]">
              {selectedMemory.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* In a real app, use a video player component */}
                  <video src={selectedMemory.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl" />
                </div>
              ) : (
                <img src={selectedMemory.url} alt={selectedMemory.caption} className="max-w-full max-h-[80vh] object-contain" />
              )}
            </div>

            {/* Sidebar Info */}
            <div className="w-full md:w-96 flex flex-col bg-zinc-900 border-l border-white/10 max-h-[90vh]">
              <div className="p-6 flex-1 overflow-y-auto">
                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 block">{selectedMemory.type}</span>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h3 className="text-2xl font-bold text-white leading-tight">{selectedMemory.caption}</h3>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(selectedMemory.id);
                        setSelectedMemory(null);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete Memory"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
                <p className="text-zinc-400 text-sm mb-6 pb-6 border-b border-white/10">
                  Captured on {new Date(selectedMemory.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                {/* Comments Section */}
                {canComment && (
                  <div className="space-y-4">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <MessageCircle size={16} className="text-blue-400" />
                      Comments
                    </h4>

                    <div className="space-y-3">
                      {(selectedMemory.comments && selectedMemory.comments.length > 0) ? (
                        selectedMemory.comments.map((comment: any, idx: number) => (
                          <div key={idx} className="bg-white/5 rounded-xl p-3">
                            <p className="text-sm text-zinc-300">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-500 text-sm italic">No comments yet. Be the first!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-4 bg-zinc-950 border-t border-white/10 space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                  >
                    <Heart size={18} className="text-red-500 fill-red-500" /> Like ({selectedMemory.likes})
                  </button>
                  <button className="p-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700" title="Maximize" aria-label="Maximize image">
                    <Maximize2 size={18} />
                  </button>
                </div>

                {/* Add Comment Input */}
                {canComment && (
                  <form onSubmit={handleAddComment} className="relative">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Add a comment... (Not persisted)"
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-800 transition-all text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 disabled:text-zinc-600 hover:text-blue-300 p-2 transition-colors"
                      title="Post Comment"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-blue-400" />
                Add New Memory
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close modal"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddMemory} className="p-6 space-y-4">
              {/* Type Selection */}
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setNewType('image')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newType === 'image' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Photo</button>
                <button type="button" onClick={() => setNewType('video')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newType === 'video' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Video</button>
              </div>

              {/* Upload */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors relative">
                <input type="file" title="Upload a memory" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,video/*" onChange={handleFileUpload} />
                {isUploading ? (
                  <p className="text-blue-600 font-bold animate-pulse">Uploading...</p>
                ) : newUrl ? (
                  newType === 'image' ? (
                    <img
                      src={newUrl}
                      alt="New memory preview"
                      className="h-32 object-contain rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Film size={32} className="text-blue-500 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Video Selected</p>
                    </div>
                  )
                ) : (
                  <>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Click to upload</p>
                    <p className="text-xs text-slate-400">or drag and drop</p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Caption</label>
                <input
                  required
                  value={newCaption}
                  onChange={e => setNewCaption(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What's happening in this moment?"
                />
              </div>

              <button type="submit" disabled={!newUrl} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                Post Memory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Memories;
