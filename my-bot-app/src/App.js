import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2, Database, Sparkles, FileText } from 'lucide-react';

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
  const [isSendingQuery, setIsSendingQuery] = useState(false);
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const messagesEndRef = useRef(null);

  const apiKey = process.env.REACT_APP_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const qaSystemPrompt = `
    You are "Project Samarth," an expert AI assistant for analyzing Indian public data.
    Your mission is to answer complex, natural language questions about India's agricultural economy and its relationship with climate patterns.
    
    RULES:
    1.  **Source Data:** Your primary goal is to find and synthesize information from official Indian government portals. You MUST prioritize data from 'data.gov.in', the Ministry of Agriculture & Farmers Welfare ('agriwelfare.gov.in'), and the India Meteorological Department ('imd.gov.in').
    2.  **Use Search:** You MUST use the Google Search tool to find live, real-time data to answer questions. Do not make up data or use old knowledge.
    3.  **Synthesize:** Answer the user's question directly. Do not just list search results. Synthesize information from multiple sources to form a single, coherent answer.
    4.  **Formatting (CRITICAL):** You MUST format your entire response using GitHub-Flavored Markdown. Use headers (##, ###), lists (*, 1.), and bold text (**) to make the response clear and readable. Tables are also supported.
    5.  **Cite Sources (CRITICAL):** For EVERY data point, statistic, or claim you make, you MUST cite the specific dataset, report, or page it came from. The grounding tool will provide you with sources.
    6.  **Persona:** You are an expert policy advisor's assistant. Your tone is formal, data-driven, and precise.
  `;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);

  const callGeminiAPI = async (contents, systemInstruction, withGrounding = false) => {
    const payload = { contents, systemInstruction: { parts: [{ text: systemInstruction }] } };
    if (withGrounding) payload.tools = [{ "google_search": {} }];

    let response;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      const delay = 1000 * Math.pow(2, retries);
      response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (response.ok) break;
      if (response.status === 429 || response.status >= 500) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) throw new Error(`API call failed after ${maxRetries} retries.`);
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (!candidate) throw new Error("Invalid response structure from API.");
    return candidate;
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMessage = { role: 'user', content: query, sources: [] };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsSendingQuery(true);

    const chatHistory = messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
    const contents = [...chatHistory, { role: 'user', parts: [{ text: query }] }];

    try {
      const candidate = await callGeminiAPI(contents, qaSystemPrompt, true);
      const text = candidate.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
      let sources = [];
      const groundingMetadata = candidate.groundingMetadata;
      if (groundingMetadata && groundingMetadata.groundingAttributions) {
        sources = groundingMetadata.groundingAttributions
          .map(attribution => ({ uri: attribution.web?.uri, title: attribution.web?.title }))
          .filter(source => source.uri && source.title);
      }
      const assistantMessage = { role: 'assistant', content: text, sources };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("API Error:", error.message, error.stack);
      const errorMessage = { role: 'assistant', content: "Sorry, I encountered an error trying to answer that. Please check the console or try again.", sources: [] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSendingQuery(false);
    }
  };

  const handleDraftBrief = async () => {
    setIsGeneratingMeta(true);
    setMessages(prev => [...prev, { role: 'assistant', content: "✨ Drafting policy brief based on our conversation...", sources: [] }]);

    const conversation = messages
      .filter(msg => !msg.content.includes("Welcome"))
      .map(msg => `${msg.role === 'user' ? 'User' : 'Samarth'}: ${msg.content}`)
      .join('\n\n');
    const briefPrompt = `You are a senior policy advisor. Based on the following conversation, draft a concise policy brief for a minister. The conversation is between a user and an AI assistant named Samarth.
    
    **Format (Use Markdown):**
    ### Background
    (A brief summary of the user's inquiry.)
    
    ### Key Data-Backed Findings
    (Bulleted list of the most critical data points Samarth provided.)
    
    ### Potential Policy Implications
    (Bulleted list of insights or potential actions based on the findings.)
    
    The tone should be formal and executive. Do not include a title.
    
    CONVERSATION LOG:
    """
    ${conversation}
    """`;
    const contents = [{ role: 'user', parts: [{ text: briefPrompt }] }];
    const briefSystemInstruction = "You are a helpful writing assistant specializing in formal policy memos.";

    try {
      const candidate = await callGeminiAPI(contents, briefSystemInstruction, false);
      const text = candidate.content?.parts?.[0]?.text || "Sorry, I couldn't generate the brief.";
      setMessages(prev => [...prev, { role: 'assistant', content: text, sources: [] }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error trying to draft the brief.", sources: [] }]);
    } finally {
      setIsGeneratingMeta(false);
    }
  };

  const handleSuggestFollowUps = async (aiResponseContent) => {
    setIsGeneratingMeta(true);
    setMessages(prev => [...prev, { role: 'assistant', content: "✨ Generating suggested follow-ups...", sources: [] }]);

    const suggestPrompt = `Based on this AI assistant's answer, suggest 3 insightful follow-up questions a policy advisor might ask.
    
    **Format (Use Markdown):**
    * *Question 1...*
    * *Question 2...*
    * *Question 3...*

    Respond with *only* the 3 questions.
    
    AI'S ANSWER:
    """
    ${aiResponseContent}
    """`;
    const contents = [{ role: 'user', parts: [{ text: suggestPrompt }] }];
    const suggestSystemInstruction = "You are a helpful assistant that suggests relevant questions.";

    try {
      const candidate = await callGeminiAPI(contents, suggestSystemInstruction, false);
      const text = candidate.content?.parts?.[0]?.text || "Sorry, I couldn't generate suggestions.";
      setMessages(prev => [...prev, { role: 'assistant', content: text, sources: [] }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error trying to generate suggestions.", sources: [] }]);
    } finally {
      setIsGeneratingMeta(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-inter">
      <header className="bg-gray-800 p-4 border-b border-gray-700 shadow-md flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center">
          <Database className="mr-2 text-blue-400" />
          Project Samarth
        </h1>
        <button
          onClick={handleDraftBrief}
          disabled={isGeneratingMeta || messages.length <= 1}
          className="flex items-center px-3 py-2 bg-blue-600 rounded-lg text-sm text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isGeneratingMeta ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          ✨ Draft Policy Brief
        </button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <ChatMessage
              key={index}
              message={msg}
              isGeneratingMeta={isGeneratingMeta}
              onSuggestFollowUps={handleSuggestFollowUps}
            />
          ))
        ) : (
          <div className="text-gray-300">Loading...</div>
        )}
        {isSendingQuery && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </main>
      <footer className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="max-w-3xl mx-auto flex items-center space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isSendingQuery && handleSend()}
            placeholder="Ask a complex question..."
            className="flex-1 p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            disabled={isSendingQuery}
          />
          <button
            onClick={handleSend}
            disabled={isSendingQuery}
            className="p-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isSendingQuery ? <Loader2 className="animate-spin" /> : <Send />}
          </button>
        </div>
      </footer>
    </div>
  );
}

// --- Chat Message Component ---
function ChatMessage({ message, isGeneratingMeta, onSuggestFollowUps }) {
  const { role, content, sources } = message;
  const isUser = role === 'user';
  
  // Don't show "suggest" button for welcome, errors, or system messages
  const showSuggestButton = !isUser && 
                            !content.includes("Welcome") && 
                            !content.includes("Sorry") &&
                            !content.includes("Generating") &&
                            !content.includes("Drafting");
  
  // --- NEW: Create Markdown table string from sources ---
  const [sourceTable, setSourceTable] = useState('');
  useEffect(() => {
    if (sources && sources.length > 0) {
      let table = "| Title | URL |\n| :--- | :--- |\n";
      sources.forEach(source => {
        // Sanitize title to prevent breaking table
        const title = source.title ? source.title.replace(/\|/g, ' ') : 'Source';
        table += `| ${title} | [${source.uri}](${source.uri}) |\n`;
      });
      setSourceTable(table);
    } else {
      setSourceTable('');
    }
  }, [sources]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full max-w-xl lg:max-w-2xl px-5 py-3 rounded-xl shadow-md ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
        <div className="flex items-center mb-2">
          {isUser ? (
            <User className="w-5 h-5 mr-2" />
          ) : (
            <Bot className="w-5 h-5 mr-2" />
          )}
          <span className="font-bold">{isUser ? 'You' : 'Samarth'}</span>
        </div>
        
        {/* --- MODIFIED: Use ReactMarkdown with custom components for styling --- */}
        <ReactMarkdown
          components={{
            p: ({ node, ...props }) => <p {...props} className="my-2 text-gray-200" />,
            h1: ({ node, ...props }) => <h1 {...props} className="my-3 text-2xl font-bold">{props.children || 'Heading'}</h1>,
            h2: ({ node, ...props }) => <h2 {...props} className="my-3 text-xl font-semibold">{props.children || 'Subheading'}</h2>,
            h3: ({ node, ...props }) => <h3 {...props} className="my-3 text-lg font-medium">{props.children || 'Sub-subheading'}</h3>,
            ul: ({ node, ...props }) => <ul {...props} className="my-2 list-disc pl-5" />,
            ol: ({ node, ...props }) => <ol {...props} className="my-2 list-decimal pl-5" />,
            li: ({ node, ...props }) => <li {...props} className="text-gray-200" />,
            a: ({ node, ...props }) => <a {...props} className="text-blue-300 hover:underline" target="_blank" rel="noopener noreferrer">{props.children || 'Link'}</a>,
            strong: ({ node, ...props }) => <strong {...props} className="text-white font-bold" />
          }}
        >
          {content}
        </ReactMarkdown>
        
        {/* --- MODIFIED: Render sources as a Markdown table --- */}
        {sourceTable && (
          <div className="mt-4 pt-3 border-t border-gray-600">
            <h4 className="text-sm font-semibold mb-2 text-gray-300">Sources:</h4>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p {...props} className="my-0" />,
                table: ({ node, ...props }) => <table {...props} className="w-full text-xs border-collapse" />,
                th: ({ node, ...props }) => <th {...props} className="border p-1 bg-gray-600 text-white" />,
                td: ({ node, ...props }) => <td {...props} className="border p-1" />,
                a: ({ node, ...props }) => <a {...props} className="text-blue-300 hover:underline" target="_blank" rel="noopener noreferrer">{props.children || 'Link'}</a>
              }}
            >
              {sourceTable}
            </ReactMarkdown>
          </div>
        )}

        {/* --- ✨ NEW: Suggest Follow-ups Button --- */}
        {showSuggestButton && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <button
              onClick={() => onSuggestFollowUps(content)}
              disabled={isGeneratingMeta}
              className="text-xs flex items-center px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              ✨ Suggest Follow-ups
            </button>
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