import { create } from 'zustand';
import { CommentaryTemplate, CommentaryEventType } from '../types';

interface CommentaryStore {
    templates: CommentaryTemplate[];
    lastUsedIds: Record<string, string>; // category -> template ID
    fetchTemplates: () => Promise<void>;
    getRandomDialogue: (category: CommentaryEventType) => string;
}

export const useCommentaryStore = create<CommentaryStore>((set, get) => ({
    templates: [],
    lastUsedIds: {},
    fetchTemplates: async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');
            const res = await fetch(`${apiUrl}/commentary/templates`);
            if (res.ok) {
                const data = await res.json();
                // Filter only active templates
                set({ templates: data.filter((t: CommentaryTemplate) => t.is_active) });
            }
        } catch (error) {
            console.error("Failed to fetch commentary templates:", error);
        }
    },
    getRandomDialogue: (category: CommentaryEventType) => {
        const { templates, lastUsedIds } = get();
        
        // Find templates for the specific category
        let available = templates.filter(t => t.event_type === category);
        
        if (available.length === 0) {
            return ""; // Fallback
        }

        // Duplicate prevention logic (don't use the same one twice in a row if we have > 1)
        if (available.length > 1 && lastUsedIds[category]) {
            available = available.filter(t => t.id !== lastUsedIds[category]);
        }

        // Pick a random template
        const picked = available[Math.floor(Math.random() * available.length)];
        
        // Update history
        set((state) => ({
            lastUsedIds: {
                ...state.lastUsedIds,
                [category]: picked.id
            }
        }));

        return picked.text;
    }
}));
