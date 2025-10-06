import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { AnalysisRunData, ChatMessage } from '../../types';
import { getChatbotAdvice } from '../../services/geminiService';

interface ChatbotPanelProps {
  analysisData: AnalysisRunData;
  onClose?: () => void;
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ analysisData, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'initial', author: 'bot', content: 'Chào bạn, tôi là trợ lý AI. Tôi có thể giúp gì cho bạn với danh sách ứng viên này?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build dynamic suggestions based on candidate/job context
  const suggestions = useMemo(() => {
    const cands = analysisData?.candidates || [];
    const jobTitle = analysisData.job.position;
    if (!cands.length) {
      return [
        `Ứng viên nào phù hợp nhất với vị trí ${jobTitle}?`,
        `3 ứng viên nào nên ưu tiên phỏng vấn đầu cho ${jobTitle}?`,
        `Điểm yếu quan trọng nào cần lưu ý khi chọn ứng viên cho ${jobTitle}?`
      ];
    }

    const industryCount: Record<string, number> = {};
    for (const c of cands) {
      const ind = (c.industry || '').trim();
      if (!ind) continue;
      industryCount[ind] = (industryCount[ind] || 0) + 1;
    }
    let dominantIndustry = '';
    let max = 0;
    for (const [ind, cnt] of Object.entries(industryCount)) {
      if (cnt > max) { max = cnt; dominantIndustry = ind; }
    }

    const baseQuestions: string[] = [];
    if (dominantIndustry) {
      baseQuestions.push(
        `Ứng viên nào nổi bật nhất trong ngành ${dominantIndustry} cho vị trí ${jobTitle}?`,
        `Top 3 ứng viên ngành ${dominantIndustry} nên phỏng vấn đầu và lý do?`,
        `Những rủi ro quan trọng cần chú ý khi chọn ứng viên trong ngành ${dominantIndustry} cho ${jobTitle}?`
      );
    } else {
      baseQuestions.push(
        `Ứng viên nào phù hợp nhất với vị trí ${jobTitle}?`,
        `3 ứng viên nào nên ưu tiên phỏng vấn đầu cho ${jobTitle}?`,
        `Điểm yếu quan trọng nào cần lưu ý khi chọn ứng viên cho ${jobTitle}?`
      );
    }

    // Trả về đúng 3 câu (ưu tiên mức độ quyết định: chọn ai -> shortlist -> rủi ro)
    return baseQuestions.slice(0, 3);
  }, [analysisData]);

  const handleSuggestionClick = async (suggestion: string) => {
    setUserInput(suggestion);
    setShowSuggestions(false);
    // Auto submit
    const userMessage: ChatMessage = { id: Date.now().toString(), author: 'user', content: suggestion };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const { responseText, candidateIds } = await getChatbotAdvice(analysisData, suggestion);
      const suggestedCandidates = analysisData.candidates.filter(c => candidateIds.includes(c.id));
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        author: 'bot',
        content: responseText,
        suggestedCandidates: suggestedCandidates.length > 0 ? suggestedCandidates.map(c => ({
          id: c.id,
          candidateName: c.candidateName,
          analysis: c.analysis,
        })) : undefined,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
      const botError: ChatMessage = {
        id: (Date.now() + 1).toString(),
        author: 'bot',
        content: `Rất tiếc, đã có lỗi: ${errorMessage}`,
      };
      setMessages(prev => [...prev, botError]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), author: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const { responseText, candidateIds } = await getChatbotAdvice(analysisData, userInput);
      const suggestedCandidates = analysisData.candidates.filter(c => candidateIds.includes(c.id));
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        author: 'bot',
        content: responseText,
        suggestedCandidates: suggestedCandidates.length > 0 ? suggestedCandidates.map(c => ({
          id: c.id,
          candidateName: c.candidateName,
          analysis: c.analysis,
        })) : undefined,
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
      const botError: ChatMessage = {
        id: (Date.now() + 1).toString(),
        author: 'bot',
        content: `Rất tiếc, đã có lỗi: ${errorMessage}`,
      };
      setMessages(prev => [...prev, botError]);
    } finally {
      setIsLoading(false);
    }
  };

  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isBot = message.author === 'bot';
    return (
      <div className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
        {isBot && <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><i className="fa-solid fa-robot text-sky-500"></i></div>}
        <div className={`max-w-xs md:max-w-sm lg:max-w-xs rounded-2xl px-4 py-2.5 ${isBot ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-sky-800 text-white rounded-br-none'}`}>
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.suggestedCandidates && (
            <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
              <p className="text-xs font-semibold text-slate-400">Ứng viên liên quan:</p>
              {message.suggestedCandidates.map(c => (
                <div key={c.id} className="bg-slate-700/50 p-2 rounded-lg text-xs">
                  <p className="font-bold text-white">{c.candidateName}</p>
                  <p className="text-slate-300">Hạng: {c.analysis?.['Hạng']} - Điểm: {c.analysis?.['Tổng điểm']}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl shadow-lg flex flex-col h-96 max-h-[70vh] z-50">
      <header className="p-4 border-b border-slate-700 flex-shrink-0 flex items-center justify-between">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <i className="fa-solid fa-brain text-sky-500"></i>
          Trợ lý Tuyển dụng AI
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Đóng chatbot"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
        {isLoading && (
          <div className="flex justify-start gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><i className="fa-solid fa-robot text-sky-500"></i></div>
             <div className="max-w-xs rounded-2xl px-4 py-3 bg-slate-800 rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      <div className="p-3 border-t border-slate-700 flex-shrink-0 bg-slate-800/50 rounded-b-2xl">
        {showSuggestions && messages.length === 1 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-2">Gợi ý câu hỏi:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-full transition-colors border border-slate-600"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Hỏi AI về ứng viên..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-600 transition-colors disabled:opacity-50"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !userInput.trim()} className="w-10 h-10 flex items-center justify-center bg-sky-700 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0">
            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatbotPanel;
