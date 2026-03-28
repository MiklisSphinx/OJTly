'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'ai';
};

export default function AIChatbot() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! 👋 I am your OJT Assistant. I can help you find internships, review your resume, or answer questions about the platform. How can I help you today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    // 1. Add User Message
    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    
    // 2. Simulate AI Thinking
    setIsTyping(true);

    // 3. Generate Mock AI Response
    setTimeout(() => {
      const aiResponse = generateResponse(currentInput);
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: aiResponse, sender: 'ai' }]);
      setIsTyping(false);
    }, 1500);
  };

  // Mock Logic for Demo
  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('resume') || q.includes('cv')) {
      return "A great resume for OJT should highlight your projects and skills relevant to the job. Would you like me to list the key sections you need?";
    }
    if (q.includes('find') || q.includes('job')) {
      return "You can use the 'Find OJT' page to search for jobs. Try filtering by 'Remote' or 'On-Site' to narrow your search. Want me to explain how the KNN algorithm recommends jobs?";
    }
    if (q.includes('hello') || q.includes('hi')) {
      return "Hi there! Ready to find your dream internship?";
    }
    if (q.includes('interview')) {
      return "For interviews, be sure to research the company and prepare answers for common behavioral questions. Confidence is key!";
    }
    return "I am currently a demo bot. In a full version, I would be connected to OpenAI or a database to answer complex questions. For now, try asking about 'resume' or 'interview'!";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm h-16 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/student_main" className="p-2 -ml-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800">OJTly Assistant</h1>
                <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => router.push('/login')} className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors">Logout</button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 bg-slate-50 bg-[url('/grid-pattern.svg')] bg-repeat">
        <div className="max-w-3xl mx-auto space-y-4">
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Avatar (AI Only) */}
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 bg-slate-300 rounded-full flex-shrink-0 flex items-center justify-center text-slate-600">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
              )}

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-md' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-bl-md'
              }`}>
                {msg.text}
              </div>

            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-7 h-7 bg-slate-300 rounded-full flex-shrink-0 flex items-center justify-center text-slate-600">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-lg flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>

        </div>
      </footer>

    </div>
  );
}