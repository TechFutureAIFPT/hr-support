import React, { useState } from 'react';
import { extractTextFromJdFile } from '../../services/ocrService';
import { extractJobPositionFromJD, filterAndStructureJD } from '../../services/geminiService';

interface JDInputProps {
  jdText: string;
  setJdText: React.Dispatch<React.SetStateAction<string>>;
  jobPosition: string;
  setJobPosition: React.Dispatch<React.SetStateAction<string>>;
  onComplete: () => void;
}

const JDInput: React.FC<JDInputProps> = ({ jdText, setJdText, jobPosition, setJobPosition, onComplete }) => {
  const isCompleteEnabled = jdText.trim().length > 50 && jobPosition.trim().length > 3;
  const characterCount = jdText.length;

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrError, setOcrError] = useState('');
  
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState('');

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError('');
    setSummarizeError('');
    setJdText(''); // Clear previous JD on new upload
    setJobPosition(''); // Clear previous position
    setOcrMessage('Bắt đầu xử lý file...');

    try {
      const rawText = await extractTextFromJdFile(file, (message) => {
        setOcrMessage(message);
      });

      if (!rawText || rawText.trim().length < 50) {
        throw new Error('Không thể trích xuất đủ nội dung từ file. Vui lòng thử file khác hoặc nhập thủ công.');
      }
      
      setOcrMessage('AI đang phân tích và cấu trúc JD...');
      const structuredJd = await filterAndStructureJD(rawText);
      setJdText(structuredJd);

      setOcrMessage('Đã cấu trúc JD, đang xác định chức danh...');
      const extractedPosition = await extractJobPositionFromJD(structuredJd);
      if (extractedPosition) {
        setJobPosition(extractedPosition);
      }
      
    } catch (error) {
      console.error("Lỗi xử lý JD:", error);
      const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
      setOcrError(errorMessage);
      setJdText(''); // Clear text area on error
    } finally {
      setIsOcrLoading(false);
      setOcrMessage('');
    }
  };
  
  const handleSummarizeJD = async () => {
    if (jdText.trim().length < 200) {
      setSummarizeError("Nội dung JD quá ngắn để tóm tắt.");
      return;
    }
    
    setIsSummarizing(true);
    setSummarizeError('');
    setOcrError(''); // Clear other errors

    try {
      const structuredJd = await filterAndStructureJD(jdText);
      setJdText(structuredJd);

      const extractedPosition = await extractJobPositionFromJD(structuredJd);
      if (extractedPosition) {
        setJobPosition(extractedPosition);
      }

    } catch (error) {
      console.error("Lỗi tóm tắt JD:", error);
      const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định khi tóm tắt.";
      setSummarizeError(errorMessage);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <section id="module-jd" className="module-pane active w-full" aria-labelledby="jd-title">
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        
  <div className="w-full max-w-6xl" style={{maxWidth: '67rem'}}>{/* mở rộng thêm ~10% nữa (≈60.95rem -> 67rem) */}
          
          <div className="p-8 md:p-12 bg-[--card] border border-[--card-stroke] rounded-2xl shadow-2xl backdrop-blur-lg transition-transform duration-300 hover:-translate-y-0.5" style={{boxShadow: 'var(--shadow)'}}>
            <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
                <div className="relative w-full flex-grow">
                  <input
                    type="text"
                    id="job-position"
                    value={jobPosition}
                    onChange={(e) => setJobPosition(e.target.value)}
                    className="peer block w-full text-base px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[--primary]/50 placeholder-transparent"
                    placeholder="Vd: Senior Frontend Developer"
                    aria-describedby="job-title-help"
                    required
                  />
                  <label
                    htmlFor="job-position"
                    className="absolute -top-2.5 left-3 bg-[--bg] px-1 text-base text-[--muted] transition-all duration-300 pointer-events-none
                               peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-4 peer-placeholder-shown:text-lg peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
                               peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-[--bg] peer-focus:px-1 peer-focus:text-base peer-focus:text-[--primary]"
                  >
                    <i className="fa-solid fa-briefcase mr-1.5 text-[--accent]/80 opacity-0 peer-focus:opacity-100 transition-opacity"></i>Chức danh công việc <span className="text-red-400">*</span>
                  </label>
                  <p id="job-title-help" className="sr-only">Nhập chức danh công việc bạn đang tuyển dụng.</p>
                </div>

                {isOcrLoading ? (
                  <div className="flex items-center gap-2 text-[--primary]/80 h-12 px-5 flex-shrink-0">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>{ocrMessage}</span>
                  </div>
                ) : (
                  <label 
                    htmlFor="ocr-jd-input"
                    title="Nhận JD từ PDF/DOCX/PNG bằng OCR"
                    aria-label="Quét OCR JD"
                    className="w-full md:w-auto flex-shrink-0 cursor-pointer h-12 px-5 flex items-center justify-center text-base font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-600 border border-blue-400/50 rounded-xl hover:from-blue-600 hover:to-cyan-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 shadow-md"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles mr-2 text-lg"></i>
                    OCR JD
                    <input
                      id="ocr-jd-input"
                      type="file"
                      className="hidden"
                      accept=".pdf, .docx, .png, .jpg, .jpeg"
                      onChange={handleOcrFileChange}
                      onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
                      disabled={isOcrLoading || isSummarizing}
                    />
                  </label>
                )}
            </div>
            
            <div className="relative">
              <textarea
                id="job-description"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl
                           min-h-[270px] sm:min-h-[305px] md:min-h-[347px]
                           text-base text-[--txt] leading-relaxed placeholder:text-[--muted]/60 
                           resize-none 
                           focus:outline-none focus:ring-2 focus:ring-[--primary]/50 whitespace-pre-wrap"
                placeholder="Dán mô tả công việc đầy đủ tại đây, hoặc dùng OCR JD..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              ></textarea>
              
              {isSummarizing ? (
                  <div className="absolute top-3 right-3 flex items-center gap-2 text-[--accent]/80 h-8 px-3 bg-[--bg] rounded-lg">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span className="text-xs">AI đang rút gọn...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSummarizeJD}
                    disabled={isOcrLoading || isSummarizing || jdText.trim().length < 200}
                    title="Dùng AI để tóm tắt và cấu trúc lại JD đã dán"
                    aria-label="Rút gọn ý chính JD"
                    className="absolute top-3 right-3 h-8 px-3 flex items-center justify-center text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 border border-purple-400/50 rounded-lg hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:bg-slate-600"
                  >
                    <i className="fa-solid fa-brain mr-1.5"></i>
                    Rút gọn JD
                  </button>
                )}

              <div className="absolute bottom-3 left-4 text-xs font-mono text-[--muted] pointer-events-none">
                {characterCount} ký tự
              </div>
            </div>
            
            {(ocrError || summarizeError) && (
              <p className="text-[--warning] text-sm mt-4 text-left w-full font-medium">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>{ocrError || summarizeError}
              </p>
            )}

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 flex gap-3">
                <a 
                  href="https://parse-jd.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Mở trang cải thiện JD"
                  className="flex-1 h-12 px-4 flex items-center justify-center text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 border border-purple-400/50 rounded-lg hover:from-purple-600 hover:to-pink-700 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 shadow-md"
                >
                  <i className="fa-solid fa-wand-magic-sparkles md:mr-2"></i>
                  <span className="hidden md:inline">Cải thiện JD</span>
                </a>
                <a 
                  href="https://forms.gle/S9WWRArx1pzWF6Bj8"
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Mở trang khảo sát phần mềm"
                  className="flex-1 h-12 px-4 flex items-center justify-center text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400/50 rounded-lg hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 shadow-md"
                >
                  <i className="fa-solid fa-clipboard-question md:mr-2"></i>
                  <span className="hidden md:inline">Khảo sát</span>
                </a>
              </div>
              <button
                onClick={onComplete}
                disabled={!isCompleteEnabled}
                className="h-12 px-8 text-base font-semibold flex items-center justify-center gap-2 rounded-xl text-[--bg] transition-all duration-300 ease-in-out shadow-lg bg-gradient-to-r from-[--primary] to-[--accent] hover:-translate-y-0.5 hover:shadow-[--accent]/20 hover:shadow-lg active:scale-95 disabled:bg-slate-700/50 disabled:text-slate-400 disabled:translate-y-0 disabled:shadow-none"
              >
                <span className="hidden md:inline">Hoàn thành & Tiếp tục</span>
                <i className="fa-solid fa-check"></i>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default JDInput;