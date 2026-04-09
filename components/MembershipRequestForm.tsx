import React, { useState } from 'react';
import { addMembershipRequest } from '../services/storageService';
import { Send, CheckCircle, AlertCircle, X, UserPlus, Phone, Calendar, History } from 'lucide-react';

interface MembershipRequestFormProps {
    onClose: () => void;
}

const MembershipRequestForm: React.FC<MembershipRequestFormProps> = ({ onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNumber: '',
        associatedBefore: 'No' as 'Yes' | 'No',
        associationYear: ''
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            await addMembershipRequest(formData);
            setStatus('success');
            setTimeout(onClose, 2000);
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center text-center shadow-2xl">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Request Sent!</h3>
                    <p className="text-slate-500">Your membership request has been submitted successfully. The admin team will review it and get back to you.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="bg-slate-900 p-5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-blue-400" />
                        Apply for Membership
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            placeholder="e.g. Rahul Dravid"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Number</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                required
                                type="tel"
                                value={formData.contactNumber}
                                onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                                className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3 text-center">Have you been associated with Indian Strikers before?</label>
                        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm mb-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, associatedBefore: 'Yes' })}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.associatedBefore === 'Yes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Yes
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, associatedBefore: 'No' })}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.associatedBefore === 'No' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                No
                            </button>
                        </div>

                        {formData.associatedBefore === 'Yes' && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Which Year?</label>
                                <div className="relative">
                                    <History size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        required={formData.associatedBefore === 'Yes'}
                                        type="number"
                                        min="1990"
                                        max={new Date().getFullYear()}
                                        value={formData.associationYear}
                                        onChange={e => setFormData({ ...formData, associationYear: e.target.value })}
                                        className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                        placeholder="e.g. 2018"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold">
                            <AlertCircle size={16} />
                            Something went wrong. Please try again.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                    >
                        {status === 'submitting' ? (
                            'Sending Request...'
                        ) : (
                            <>
                                Submit Application <Send size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MembershipRequestForm;
