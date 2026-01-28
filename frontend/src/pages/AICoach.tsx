import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, CheckCircle, Paperclip, FileText } from "lucide-react";

type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
};

export default function AICoach() {
  const [input, setInput] = useState("");
  const [showGoalToast, setShowGoalToast] = useState(false);
  
  // NEW: Language State
  const [language, setLanguage] = useState("English");

  // NEW: State to hold the actual file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: "Welcome to MoneyPal Coach! I can analyze your finances or read your documents in English, Hindi, or Kannada. How can I help?", 
      sender: "ai" 
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = async () => {
    // Allow sending if there is text OR a file
    if (!input.trim() && !selectedFile) return;

    const token = localStorage.getItem("token");
    
    // UI: Show the user what they sent (Text + File indicator)
    const displayMessage = selectedFile 
      ? `${input} \n[📎 Attached: ${selectedFile.name}]`
      : input;

    const userMsg: Message = { id: Date.now(), text: displayMessage.trim(), sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    // --- MAGIC SYNC LOGIC ---
    const lowerInput = currentInput.toLowerCase();
    const syncKeywords = ["yes", "ok", "go ahead", "do it", "sure", "done", "ha", "haan", "sari"]; 

    if (syncKeywords.some(keyword => lowerInput.includes(keyword))) {
        localStorage.setItem("ai_goal_active", "true");
        setShowGoalToast(true);
        setTimeout(() => setShowGoalToast(false), 4000); 
    }

    try {
      const formData = new FormData();
      // FIX: Use the 'language' state variable here
      formData.append("message", currentInput || `Summarize this file in ${language}`); 
      formData.append("language", language); 
      
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      // FIX: Correct URL (Clean String)
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}` 
        },
        body: formData, 
      });

      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, text: data.reply, sender: "ai" }]);

      // Cleanup after success
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; 

    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "I'm having trouble connecting to the server. Please ensure the backend is running.", 
        sender: "ai" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '25px', backgroundColor: '#f8faff', height: 'calc(100vh - 80px)', position: 'relative' }}>
      
      {/* Magic Sync Notification Toast */}
      {showGoalToast && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#16a34a', color: 'white', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000 }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: '600' }}>Goal Synced to Dashboard! 🎸</span>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        accept=".csv,.pdf"
      />

      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>MoneyPal Coach</h1>
      </div>

      <div className="chat-container" style={{ backgroundColor: 'white', borderRadius: '24px', height: '85%', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div className="messages-list" style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: '20px', gap: '12px' }}>
              {msg.sender === 'ai' && <div style={{ padding: '8px', backgroundColor: '#8b5cf615', borderRadius: '50%', height: 'fit-content' }}><Bot size={20} color="#8b5cf6" /></div>}
              <div style={{ maxWidth: '75%', padding: '16px', borderRadius: msg.sender === 'user' ? '20px 20px 0 20px' : '0 20px 20px 20px', backgroundColor: msg.sender === 'user' ? '#8b5cf6' : '#f1f5f9', color: msg.sender === 'user' ? 'white' : '#1e293b', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>
              {msg.sender === 'user' && <div style={{ padding: '8px', backgroundColor: '#e2e8f0', borderRadius: '50%', height: 'fit-content' }}><User size={20} /></div>}
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '12px', marginLeft: '45px', alignItems: 'center' }}>
              <Loader2 size={18} className="animate-spin" color="#8b5cf6" />
              <div style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: '600' }}>Analyzing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area" style={{ padding: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', flexDirection: 'column' }}>
            
            {/* Language Selector */}
            <div style={{display:'flex', gap:'8px', paddingBottom:'5px'}}>
                {['English', 'Hindi', 'Kannada'].map((lang) => (
                    <button 
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        style={{
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            border: '1px solid #e2e8f0', 
                            backgroundColor: language === lang ? '#8b5cf6' : 'white', 
                            color: language === lang ? 'white' : '#64748b', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {lang === 'English' ? '🇺🇸 English' : lang === 'Hindi' ? '🇮🇳 Hindi' : '🇮🇳 Kannada'}
                    </button>
                ))}
            </div>

            {/* Attached File Name Indicator */}
            {selectedFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: '600', paddingLeft: '5px' }}>
                    <FileText size={14}/> 
                    Attached: {selectedFile.name}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                  onClick={handleAttachmentClick} 
                  style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: selectedFile ? '#dcfce7' : 'white', color: selectedFile ? '#16a34a' : '#64748b', cursor: 'pointer' }}
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text" placeholder={`Message MoneyPal in ${language}...`}
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                  style={{ flex: 1, padding: '15px 25px', borderRadius: '15px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
                <button onClick={handleSend} disabled={isLoading} style={{ backgroundColor: '#8b5cf6', color: 'white', width: '55px', borderRadius: '15px', border: 'none', cursor: 'pointer' }}>
                  <Send size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}