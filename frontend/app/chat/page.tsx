"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  MessageSquare, Send, Sparkles, RefreshCw, Mic, MicOff, Volume2, ShieldCheck, Landmark, Users 
} from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API Voice States
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("stockify_token");
    if (!token) {
      router.push("/");
      return;
    }
    loadChatHistory();
    setupSpeechRecognition();
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const data = await api.getChatHistory();
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const setupSpeechRecognition = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = 
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN"; // Set locale
        
        rec.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setInput((prev) => prev + " " + transcript);
          setIsRecording(false);
        };

        rec.onerror = (e: any) => {
          console.error("Speech recognition error", e);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  };

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser version. Please try Chrome/Edge.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSpeakText = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // If speaking, cancel
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
      }
      
      // Remove markdown markers for clearer speech synthesis
      const cleanText = text.replace(/[*#`_\-]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300) + "...");
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    // Optimistically update list with user query
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: userMsg, timestamp: new Date().toISOString() }
    ]);

    try {
      const res = await api.sendChatMessage(userMsg);
      // Append assistant answer
      setMessages((prev) => [...prev, res]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { 
          id: Date.now() + 1, 
          role: "assistant", 
          content: "❌ Sorry, I encountered an issue processing your query. Please verify that the FastAPI backend server is running.", 
          timestamp: new Date().toISOString() 
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[75vh]">
      {/* Left Col: Chat Panel */}
      <div className="flex-1 glass-panel bg-slate-950/40 p-5 flex flex-col justify-between border border-white/5 relative min-h-[60vh] lg:min-h-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Chat Header */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4 shrink-0">
          <MessageSquare className="text-emerald-400" size={18} />
          <div>
            <h2 className="font-heading font-bold text-white text-base leading-none">AI Wealth Advisor</h2>
            <span className="text-[9px] text-slate-500 mt-1 block">RAG financial database compliance checks enabled</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 text-xs leading-relaxed max-h-[50vh] lg:max-h-[60vh]">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-500">Retrieving chat log histories...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3 max-w-sm mx-auto">
              <Sparkles className="text-emerald-400 mx-auto" size={24} />
              <p>Hello! I am your Stockify AI Orchestrator. Ask me anything about matching funds, performance comparisons, capital gains tax rules, or rebalancing plans.</p>
              <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                {["Compare HDFC Top 100 vs SBI Bluechip", "What is my XIRR return?", "Suggest ELSS funds for 80C Tax saving"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setInput(hint)}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded text-[10px] text-slate-300"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar bubble */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  m.role === "user" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15"
                }`}>
                  {m.role === "user" ? "U" : "AI"}
                </div>
                
                {/* Message Box */}
                <div className={`p-3.5 rounded-xl border relative group ${
                  m.role === "user" 
                    ? "bg-blue-500/5 border-blue-500/10 text-slate-200" 
                    : "bg-slate-900/60 border-white/5 text-slate-300"
                }`}>
                  {/* Speaker Button for TTS on AI messages */}
                  {m.role === "assistant" && (
                    <button
                      onClick={() => handleSpeakText(m.content)}
                      className="absolute right-2 top-2 p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Speak Text"
                    >
                      <Volume2 size={12} />
                    </button>
                  )}
                  
                  <div className="whitespace-pre-line leading-relaxed prose prose-invert prose-xs">
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0 border-t border-white/5 pt-3">
          {/* Mic Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isRecording 
                ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse" 
                : "bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
            }`}
            title="Toggle Voice Input"
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          
          <input
            type="text"
            required
            disabled={sending}
            placeholder={isRecording ? "Listening..." : "Ask Stockify AI..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-white/5 rounded-lg py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 rounded-lg text-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            {sending ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
          </button>
        </form>
      </div>

      {/* Right Col: System Framework Info Panel */}
      <div className="w-full lg:w-80 glass-panel bg-slate-950/60 p-5 shrink-0 flex flex-col justify-between border border-white/5 space-y-4">
        <div>
          <h3 className="font-heading font-extrabold text-sm text-white mb-1.5">Agentic AI Architecture</h3>
          <span className="text-[10px] text-slate-500 block mb-4">Under the hood of Stockify multi-agent orchestrations</span>

          <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
            <div className="flex gap-2">
              <ShieldCheck className="text-emerald-400 shrink-0" size={16} />
              <div>
                <span className="font-semibold text-white block mb-0.5">RAG Compliance Node</span>
                Cross-references SEBI guidelines and taxation codes dynamically.
              </div>
            </div>

            <div className="flex gap-2">
              <Landmark className="text-emerald-400 shrink-0" size={16} />
              <div>
                <span className="font-semibold text-white block mb-0.5">XIRR & ML Engine</span>
                Triggers Holt-Winters forecasts and XIRR matrices in real-time.
              </div>
            </div>

            <div className="flex gap-2">
              <Users className="text-emerald-400 shrink-0" size={16} />
              <div>
                <span className="font-semibold text-white block mb-0.5">Specialized Agents</span>
                Routes queries to Comparison, Optimizer, Tax, and Advisor agents.
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[10px] text-slate-500 leading-relaxed">
          💡 *Tip: Try asking: "What are the rules for equity LTCG tax?" or "Compare Nippon Small Cap vs Tata Small Cap"*
        </div>
      </div>
    </div>
  );
}
