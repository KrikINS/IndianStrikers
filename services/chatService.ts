const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');
const getHeaders = () => {
  const token = sessionStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const getChatMessages = async () => {
  const res = await fetch(`${API_URL}/chat`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch chat');
  return res.json();
};

export const sendChatMessage = async (content: string) => {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
};
