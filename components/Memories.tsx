
import React, { useState } from 'react';
import { Play, Image as ImageIcon, Plus, X, Maximize2, Heart, Film, Calendar } from 'lucide-react';
import { UserRole } from '../types';

interface Memory {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  date: string;
  likes: number;
  width?: string; // class for grid span
}

interface MemoriesProps {
  userRole: UserRole;
}

// Seed data
const INITIAL_MEMORIES: Memory[] = [
  {
    id: '1',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1531415074968-055db6435128?q=80&w=1200&auto=format&fit=crop',
    caption: 'Championship Winning Moment 2023',
    date: '2023-11-15',
    likes: 124,
    width: 'col-span-2 row-span-2'
  },
  {
    id: '2',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?q=80&w=800&auto=format&fit=crop',
    caption: 'Training Camp - Day 1',
    date: '2024-01-10',
    likes: 45,
    width: 'col-span-1 row-span-1'
  },
  {
    id: '3',
    type: 'video',
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000&auto=format&fit=crop', // Placeholder thumb
    caption: 'Match Highlights vs Royal CC',
    date: '2024-02-20',
    likes: 89,
    width: 'col-span-1 row-span-1'
  },
  {
    id: '4',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1593341646782-e0b495cffd32?q=80&w=800&auto=format&fit=crop',
    caption: 'Team Huddle before the big game',
    date: '2023-12-05',
    likes: 67,
    width: 'col-span-1 row-span-2'
  },
  {
    id: '5',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?q=80&w=800&auto=format&fit=crop',
    caption: 'Awards Night',
    date: '2023-11-20',
    likes: 150,
    width: 'col-span-1 row-span-1'
  },
   {
    id: '6',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?q=80&w=800&auto=format&fit=crop',
    caption: 'Practice Session Nets',
    date: '2024-03-01',
    likes: 32,
    width: 'col-span-1 row-span-1'
  }
];

const Memories: React.FC<MemoriesProps> = ({ userRole }) => {
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // New Memory Form
  const [newCaption, setNewCaption] = useState('');
  const [newType, setNewType] = useState<'image' | 'video'>('image');
  const [newUrl, setNewUrl] = useState('');

  const isAdmin = userRole === 'admin';

  const filteredMemories = memories.filter(m => filter === 'all' ? true : m.type === filter);

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    const newMemory: Memory = {
      id: Date.now().toString(),
      type: newType,
      url: newUrl,
      caption: newCaption || 'New Memory',
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      width: 'col-span-1 row-span-1'
    };

    setMemories([newMemory, ...memories]);
    setIsAddModalOpen(false);
    setNewCaption('');
    setNewUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Team Memories</h2>
          <p className="text-slate-500 mt-2 font-medium">Reliving the glory days, one frame at a time.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            {['all', 'image', 'video'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
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
              ${item.width}
              ${idx % 5 === 0 ? 'md:col-span-2 md:row-span-2' : ''} 
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
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
           <button 
             onClick={() => setSelectedMemory(null)}
             className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 bg-white/10 rounded-full"
           >
             <X size={24} />
           </button>

           <div className="w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row gap-6 bg-black/50 rounded-3xl overflow-hidden border border-white/10">
              {/* Media */}
              <div className="flex-1 bg-black flex items-center justify-center relative min-h-[400px]">
                 {selectedMemory.type === 'video' ? (
                   <div className="relative w-full h-full flex items-center justify-center">
                      <img src={selectedMemory.url} className="w-full h-full object-contain opacity-50" />
                      <Play size={64} className="absolute text-white/80" />
                      <p className="absolute bottom-10 text-white/50 text-sm">Video playback placeholder</p>
                   </div>
                 ) : (
                   <img src={selectedMemory.url} className="max-w-full max-h-[80vh] object-contain" />
                 )}
              </div>

              {/* Sidebar Info */}
              <div className="w-full md:w-80 p-8 flex flex-col justify-center bg-zinc-900/50 backdrop-blur-sm border-l border-white/10">
                 <div className="mb-auto">
                    <span className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 block">{selectedMemory.type}</span>
                    <h3 className="text-2xl font-bold text-white mb-4 leading-tight">{selectedMemory.caption}</h3>
                    <p className="text-zinc-400 text-sm mb-6">Captured on {new Date(selectedMemory.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
                 
                 <div className="flex items-center gap-4 py-6 border-t border-white/10">
                    <button className="flex-1 bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                       <Heart size={18} className="text-red-500 fill-red-500" /> Like ({selectedMemory.likes})
                    </button>
                    <button className="p-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700">
                       <Maximize2 size={18} />
                    </button>
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
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddMemory} className="p-6 space-y-4">
              {/* Type Selection */}
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                 <button type="button" onClick={() => setNewType('image')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newType === 'image' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Photo</button>
                 <button type="button" onClick={() => setNewType('video')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newType === 'video' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Video</button>
              </div>

              {/* Upload */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors relative">
                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileUpload} />
                 {newUrl ? (
                   <img src={newUrl} className="h-32 object-contain rounded-lg shadow-md" />
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
