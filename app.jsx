import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Database, Link as LinkIcon } from 'lucide-react';

// --- Main Application Component ---
export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: "Welcome to Project Samarth. I am an intelligent assistant designed to answer complex questions about India's agricultural economy and its relationship with climate patterns, using live data sources.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // --- System Instruction for the LLM ---
  // This guides the AI's persona, capabilities, and response format.
  const systemPrompt = `
    You are "Project Samarth," an advanced AI assistant.
    
    Your mission is to answer complex, natural language questions about India's agricultural economy and its relationship with climate patterns.
    
    You MUST adhere to the following rules:
    1.  **Source Information:** Your primary goal is to find and synthesize information from official Indian government portals, especially 'data.gov.in', as well as from the Ministry of Agriculture & Farmers Welfare and the India Meteorological Department (IMD). Use your search tool extensively to find this data.
    2.  **Accuracy & Traceability:** You MUST provide accurate, data-backed answers.
    3.  **Cite All Sources:** For EVERY piece of data, statistic, or claim you make, you MUST cite the source. List all sources clearly at the end of your response. If you cannot find a specific source for a claim, you must state that.
    4.  **Synthesize Answers:** Do not just list data. You must analyze and synthesize information from multiple sources to provide a coherent, comprehensive answer to the user's question, especially when it requires correlating agricultural production with climate data.
    5.  **Handle Ambiguity:** If a question is unclear or data is unavailable, state that clearly rather than providing an inaccurate answer.
    6.  **Persona:** You are a professional, accurate, and helpful policy and research assistant.
  `;

  // --- Scroll to bottom of chat ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- API Call Function ---
  const callGeminiAPI = async (chatHistory) => {
    setIsLoading(true);
    const apiKey = ""; // API key is handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const userQuery = chatHistory[chatHistory.length - 1].parts[0].text;

    const payload = {
      contents: chatHistory,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      tools: [{ "google_search": {} }], // Enable Google Search grounding
    };

    try {
      // Exponential backoff for retries
      let response;
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) break;

        if (response.status === 429 || response.status >= 500) {
          const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          // Break on other client-side errors
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to get response after ${maxRetries} retries. Status: ${response.status}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const text = candidate.content.parts[0].text;
        
        // Extract grounding sources
        let sources = [];
        const groundingMetadata = candidate.groundingMetadata;
        if (groundingMetadata && groundingMetadata.groundingAttributions) {
          sources = groundingMetadata.groundingAttributions
            .map(attribution => ({
              uri: attribution.web?.uri,
              title: attribution.web?.title,
            }))
            .filter(source => source.uri && source.title); // Ensure sources are valid
        }

        return { text, sources };

      } else {
        console.error("Unexpected API response structure:", result);
        return { text: "Sorry, I encountered an error processing your request. Please try again.", sources: [] };
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return { text: `Sorry, I'm having trouble connecting to my knowledge base. Error: ${error.message}`, sources: [] };
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handle User Message Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: input,
    };

    // Add user message to state
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Format chat history for the API
    const apiChatHistory = [
      ...messages.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: [{ text: input }],
      }
    ];

    // Call API and get bot response
    const botResponse = await callGeminiAPI(apiChatHistory);

    const newBotMessage = {
      id: Date.now() + 1,
      role: 'bot',
      text: botResponse.text,
      sources: botResponse.sources || [],
    };

    // Add bot message to state
    setMessages((prev) => [...prev, newBotMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="container mx-auto flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Project Samarth</h1>
            <p className="text-sm text-gray-500">Intelligent Q&A for Indian Agriculture & Climate Data</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="container mx-auto max-w-3xl">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && <LoadingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input Form */}
      <footer className="bg-white border-t border-gray-200 p-4">
        <div className="container mx-auto max-w-3xl">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a complex question..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

// --- Chat Message Component ---
function ChatMessage({ message }) {
  const { role, text, sources } = message;
  const isBot = role === 'bot';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`flex max-w-xl rounded-xl shadow-md ${
          isBot ? 'bg-white' : 'bg-blue-500 text-white'
        }`}
      >
        <div
          className={`p-2 ${
            isBot ? 'bg-gray-100' : 'bg-blue-600'
          } rounded-l-xl flex items-center justify-center`}
        >
          {isBot ? (
            <Bot className="w-6 h-6 text-blue-600" />
          ) : (
            <User className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="p-4 rounded-r-xl">
          {/* Format text to render paragraphs */}
          <div className="whitespace-pre-wrap text-sm md:text-base">
            {text.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          {/* Display Sources */}
          {isBot && sources && sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                Sources
              </h4>
              <ul className="space-y-2">
                {sources.map((source, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <LinkIcon className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate"
                      title={source.title}
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
    </div>
  );
}

// --- Loading Indicator ---
function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex max-w-xl rounded-xl shadow-md bg-white">
        <div className="p-2 bg-gray-100 rounded-l-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-blue-600" />
        </div>
        <div className="p-4 rounded-r-xl flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          <span className="text-sm text-gray-500">
            Synthesizing answer from live data...
          </span>
        </div>
      </div>
    </div>
  );
}
