import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2, Database, Sparkles, FileText } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome to **Project Samarth** — your expert on India's agriculture & climate.",
      sources: [],
    },
  ]);
  const [query, setQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMeta, setIsMeta] = useState(false);
  const endRef = useRef(null);

  const apiKey = process.env.REACT_APP_API_KEY?.trim();
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const qaPrompt = `You are Project Samarth. Answer in clean Markdown. Use Google Search grounding. Cite every fact.`;

  const scroll = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scroll, [messages]);

  const callGemini = async (contents, system, grounding = false) => {
    if (!apiKey) throw new Error('Missing API key');
    const payload = { contents, systemInstruction: { parts: [{ text: system }] } };
    if (grounding) payload.tools = [{ google_search: {} }];

    let res, tries = 0;
    while (tries < 5) {
      const delay = 1000 * 2 ** tries;
      res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) break;
      if (res.status === 429 || res.status >= 500) { tries++; await new Promise(r => setTimeout(r, delay)); }
      else throw new Error(`API Error: ${res.status}`);
    }
    if (!res?.ok) throw new Error('Failed after retries');
    const data = await res.json();
    return data.candidates?.[0] || {};
  };

  const send = async () => {
    if (!query.trim()) return;
    const userMsg = { role: 'user', content: query, sources: [] };
    setMessages(p => [...p, userMsg]);
    setQuery(''); setIsSending(true);

    const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
    try {
      const cand = await callGemini([...history, { role: 'user', parts: [{ text: query }] }], qaPrompt, true);
      const text = cand.content?.parts?.[0]?.text || 'No response';
      const sources = (cand.groundingMetadata?.groundingAttributions || [])
        .map(a => a.web && a.web.uri && a.web.title ? { uri: a.web.uri, title: a.web.title } : null)
        .filter(Boolean);
      setMessages(p => [...p, { role: 'assistant', content: text, sources }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: `**Error:** ${e.message}`, sources: [] }]);
    } finally {
      setIsSending(false);
    }
  };

  const draftBrief = async () => {
    setIsMeta(true);
    setMessages(p => [...p, { role: 'assistant', content: '*Drafting brief…*', sources: [] }]);
    const conv = messages.filter(m => !m.content.includes('Welcome')).map(m => `${m.role === 'user' ? 'User' : 'Samarth'}: ${m.content}`).join('\n\n');
    try {
      const cand = await callGemini([{ role: 'user', parts: [{ text: `Draft a policy brief:\n"""\n${conv}\n"""` }] }], 'You are a policy writer.', false);
      setMessages(p => [...p, { role: 'assistant', content: cand.content?.parts?.[0]?.text || 'Failed.', sources: [] }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${e.message}`, sources: [] }]);
    } finally {
      setIsMeta(false);
    }
  };

  const suggest = async (text) => {
    setIsMeta(true);
    setMessages(p => [...p, { role: 'assistant', content: '*Thinking…*', sources: [] }]);
    try {
      const cand = await callGemini([{ role: 'user', parts: [{ text: `Suggest 3 follow-ups:\n"""\n${text}\n"""` }] }], 'You suggest questions.', false);
      setMessages(p => [...p, { role: 'assistant', content: cand.content?.parts?.[0]?.text || 'No ideas.', sources: [] }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${e.message}`, sources: [] }]);
    } finally {
      setIsMeta(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      <header className="flex items-center justify-between p-4 bg-slate-800/80 backdrop-blur border-b border-slate-700 shadow-lg">
        <h1 className="flex items-center text-2xl font-bold text-blue-400">
          <Database className="w-7 h-7 mr-2" />
          Project Samarth
        </h1>
        <button
          onClick={draftBrief}
          disabled={isMeta || messages.length <= 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 shadow-md transition-all"
        >
          {isMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Draft Brief
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-600">
        {messages.map((m, i) => <ChatBubble key={i} msg={m} isMeta={isMeta} onSuggest={suggest} />)}
        {isSending && <LoadingBubble />}
        <div ref={endRef} />
      </main>

      <footer className="p-4 bg-slate-800/80 backdrop-blur border-t border-slate-700">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isSending && send()}
            placeholder="Ask about crops, climate, or policy..."
            className="flex-1 px-5 py-3 bg-slate-700/70 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-white shadow-inner"
            disabled={isSending}
          />
          <button
            onClick={send}
            disabled={isSending}
            className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 shadow-lg transition-all"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </footer>
    </div>
  );
}

function ChatBubble({ msg, isMeta, onSuggest }) {
  const isUser = msg.role === 'user';
  const showSuggest = !isUser && !msg.content.includes('Welcome') && !msg.content.includes('*') && !msg.content.includes('Error');

  const [tbl, setTbl] = useState('');
  useEffect(() => {
    if (msg.sources.length) {
      let md = '| Title | Link |\n|------|------|\n';
      msg.sources.forEach(s => {
        const t = (s.title || 'Source').replace(/\|/g, ' ');
        md += `| ${t} | [Open](${s.uri}) |\n`;
      });
      setTbl(md);
    } else setTbl('');
  }, [msg.sources]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div className={`group max-w-2xl p-5 rounded-2xl shadow-xl backdrop-blur-sm border ${
        isUser 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500' 
          : 'bg-slate-700/90 text-slate-100 border-slate-600'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-blue-400" />}
          <span className="font-bold text-sm">{isUser ? 'You' : 'Samarth'}</span>
        </div>

        <div className="prose prose-invert prose-lg max-w-none">
          <ReactMarkdown
            components={{
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-200 font-medium">
                  {children || 'Link'}
                </a>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>

        {tbl && (
          <div className="mt-4 pt-3 border-t border-slate-600">
            <p className="text-xs font-semibold text-slate-400 mb-2">Sources:</p>
            <ReactMarkdown className="text-xs">
              {tbl}
            </ReactMarkdown>
          </div>
        )}

        {showSuggest && (
          <button
            onClick={() => onSuggest(msg.content)}
            disabled={isMeta}
            className="mt-3 flex items-center gap-1 text-xs px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded-full transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            Suggest Follow-ups
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="p-5 rounded-2xl bg-slate-700/90 border border-slate-600 shadow-xl">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-sm">Samarth</span>
        </div>
        <div className="flex items-center mt-3 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <span className="text-sm text-slate-300">Analyzing data...</span>
        </div>
      </div>
    </div>
  );
}