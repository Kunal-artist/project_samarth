import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Database, Link as LinkIcon } from 'lucide-react';

// --- Main Application Component ---
export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome to Project Samarth. Ask me complex questions about India's agricultural economy and climate patterns.",
      sources: []
    }
  ]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const apiKey = ""; // Per instructions, leave empty.
  const apiUrl = `https://generativela-7031-dev.ai-proxy-prod.upl-gcp-public.ggr-dev.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  // System instruction for the AI
  const systemPrompt = `
    You are "Project Samarth," an expert AI assistant for analyzing Indian public data.
    Your mission is to answer complex, natural language questions about India's agricultural economy and its relationship with climate patterns.
    
    RULES:
    1.  **Source Data:** Your primary goal is to find and synthesize information from official Indian government portals. You MUST prioritize data from 'data.gov.in', the Ministry of Agriculture & Farmers Welfare ('agriwelfare.gov.in'), and the India Meteorological Department ('imd.gov.in').
    2.  **Use Search:** You MUST use the Google Search tool to find live, real-time data to answer questions. Do not make up data or use old knowledge.
    3.  **Synthesize:** Answer the user's question directly. Do not just list search results. Synthesize information from multiple sources to form a single, coherent answer.
    4.  **Cite Sources (CRITICAL):** For EVERY data point, statistic, or claim you make, you MUST cite the specific dataset, report, or page it came from. List these as "Sources" with a title and URL at the end of your response.
    5.  **Handle Inconsistency:** If data sources are inconsistent or unavailable, state that clearly rather than providing an inaccurate answer.
    6.  **Persona:** You are an expert policy advisor's assistant. Your tone is formal, data-driven, and precise.
  `;

  // Function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- API Call Function ---
  const handleSend = async () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query, sources: [] };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      // Construct the payload
      const payload = {
        contents: [
          ...messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
          {
            role: 'user',
            parts: [{ text: query }]
          }
        ],
        tools: [{ "google_search": {} }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
      };

      // --- Exponential Backoff Retry Logic ---
      let response;
      let retries = 0;
      const maxRetries = 5;
      let delay = 1000;

      while (retries < maxRetries) {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          break; // Success
        }

        if (response.status === 429 || response.status >= 500) {
          // Throttling or server error, wait and retry
          retries++;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          // Other client-side error (e.g., 400), don't retry
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
      }

      if (!response.ok) {
        throw new Error(`API call failed after ${maxRetries} retries.`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const text = candidate.content.parts[0].text;
        let sources = [];
        
        // Extract grounding sources
        const groundingMetadata = candidate.groundingMetadata;
        if (groundingMetadata && groundingMetadata.groundingAttributions) {
            sources = groundingMetadata.groundingAttributions
                .map(attribution => ({
                    uri: attribution.web?.uri,
                    title: attribution.web?.title,
                }))
                .filter(source => source.uri && source.title); // Ensure sources are valid
        }

        const assistantMessage = { role: 'assistant', content: text, sources: sources };
        setMessages(prev => [...prev, assistantMessage]);

      } else {
        throw new Error("Invalid response structure from API.");
      }

    } catch (error) {
      console.error(error);
      const errorMessage = {
        role: 'assistant',
        content: "Sorry, I encountered an error trying to answer that. Please check the console or try again.",
        sources: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-inter">
      {/* --- Header --- */}
      <header className="bg-gray-800 p-4 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold flex items-center justify-center">
          <Database className="mr-2 text-blue-400" />
          Project Samarth
        </h1>
      </header>

      {/* --- Chat Messages --- */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </main>

      {/* --- Input Area --- */}
      <footer className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="max-w-3xl mx-auto flex items-center space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask a complex question..."
            className="flex-1 p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </button>
        </div>
      </footer>
    </div>
  );
}

// --- Chat Message Component ---
function ChatMessage({ message }) {
  const { role, content, sources } = message;
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-xl shadow-md ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
        <div className="flex items-center mb-2">
          {isUser ? (
            <User className="w-5 h-5 mr-2" />
          ) : (
            <Bot className="w-5 h-5 mr-2" />
          )}
          <span className="font-bold">{isUser ? 'You' : 'Samarth'}</span>
        </div>
        {/* We use dangerouslySetInnerHTML to render newlines as <br> tags. 
            A more robust solution would parse markdown. */}
        <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}></p>
        
        {/* --- Render Sources --- */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-600">
            <h4 className="text-sm font-semibold mb-2 text-gray-300">Sources:</h4>
            <ul className="space-y-2">
              {sources.map((source, index) => (
                <li key={index} className="flex items-start">
                  <LinkIcon className="w-4 h-4 mr-2 mt-1 text-blue-400 flex-shrink-0" />
                  <a
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-300 hover:underline truncate"
                    title={source.uri}
                  >
                    {source.title || source.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Loading Indicator ---
function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-xl lg:max-w-2xl px-5 py-3 rounded-xl shadow-md bg-gray-700 text-gray-200">
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          <span className="font-bold">Samarth</span>
        </div>
        <div className="flex items-center justify-center pt-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <span className="ml-2 text-sm text-gray-300">Synthesizing answer...</span>
        </div>
      </div>
    </div>
  );
}

