import { GoogleGenAI, Type } from '@google/genai';
import PQueue from 'p-queue';
import type { Candidate, HardFilters, WeightCriteria, MainCriterion, SubCriterion, AnalysisRunData, ChatMessage } from '../types';
import { processFileToText } from './ocrService';
import { MODEL_NAME } from '../constants';

// Lazily initialize the AI client to allow the app to load even if the API key is not immediately available.
let ai: GoogleGenAI | null = null;
let currentKeyIndex = 0;
const apiKeys = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
].filter(Boolean); // Filter out undefined

// Queue for managing concurrent API calls
const apiQueue = new PQueue({ concurrency: 2 }); // Limit to 2 concurrent requests

function getAi(): GoogleGenAI {
  if (!ai) {
    if (apiKeys.length === 0) {
      throw new Error("No GEMINI_API_KEY environment variables set.");
    }
    // Try the current key
    const key = apiKeys[currentKeyIndex];
    if (!key) {
      throw new Error("API_KEY environment variable not set.");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

function switchToNextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  ai = null; // Reset to force re-init with new key
}


async function generateContentWithFallback(model: string, contents: any, config: any): Promise<any> {
  const startTime = Date.now();
  const params = { model, contents: typeof contents === 'string' ? contents.substring(0, 100) + '...' : 'complex', config };

  try {
    const result = await apiQueue.add(async () => {
      for (let attempt = 0; attempt < apiKeys.length; attempt++) {
        try {
          const aiInstance = getAi();
          const response = await aiInstance.models.generateContent({
            model,
            contents,
            config,
          });
          return response;
        } catch (error) {
          console.warn(`API key ${currentKeyIndex + 1} failed:`, error);
          switchToNextKey();
        }
      }
      throw new Error("All API keys failed. Please check your API keys and quota.");
    });

    console.log('generateContent success:', Date.now() - startTime);
    return result;
  } catch (error) {
    console.error('generateContent error:', params, null, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}


/**
 * Intelligently filters and structures raw JD text using AI.
 * Keeps only three main sections and returns a structured JSON or throws an error.
 * @param rawJdText The raw text extracted from a JD file.
 * @returns A promise that resolves to a formatted string of the structured JD.
 */
export const filterAndStructureJD = async (rawJdText: string, file?: File): Promise<string> => {
  const jdSchema = {
    type: Type.OBJECT,
    properties: {
      "MucDichCongViec": { type: Type.STRING, description: "Nội dung mục đích công việc, hoặc chuỗi rỗng nếu không tìm thấy." },
      "MoTaCongViec": { type: Type.STRING, description: "Nội dung mô tả công việc, hoặc chuỗi rỗng nếu không tìm thấy." },
      "YeuCauCongViec": { type: Type.STRING, description: "Nội dung yêu cầu công việc, hoặc chuỗi rỗng nếu không tìm thấy." },
    },
    required: ["MucDichCongViec", "MoTaCongViec", "YeuCauCongViec"]
  };

  const prompt = `
    Bạn là một AI chuyên gia xử lý văn bản JD. Nhiệm vụ của bạn là phân tích văn bản JD thô (có thể chứa lỗi OCR) và trích xuất, làm sạch, và cấu trúc lại nội dung một cách CHÍNH XÁC.

    QUY TẮC:
    1.  **Làm sạch văn bản:** Sửa lỗi chính tả, bỏ ký tự thừa, chuẩn hóa dấu câu và viết hoa cho đúng chuẩn tiếng Việt.
    2.  **BẢO TOÀN NỘI DUNG GỐC:** Giữ nguyên văn phong và ý nghĩa của các câu trong JD gốc. Chỉ sửa lỗi chính tả và định dạng, không được diễn giải lại hay tóm tắt làm thay đổi ý.
    3.  **Trích xuất 3 phần cốt lõi:** Chỉ giữ lại nội dung cho 3 mục: "Mục đích công việc", "Mô tả công việc", và "Yêu cầu công việc".
    4.  **Linh hoạt:** Hiểu các tiêu đề đồng nghĩa. Ví dụ: "Nhiệm vụ" là "Mô tả công việc"; "Yêu cầu ứng viên" là "Yêu cầu công việc".
    5.  **Loại bỏ nội dung thừa:** Xóa bỏ tất cả các phần không liên quan như giới thiệu công ty, phúc lợi, lương thưởng, thông tin liên hệ.
    6.  **Xử lý mục bị thiếu:** Nếu không tìm thấy nội dung cho một mục, trả về một chuỗi rỗng ("") cho mục đó trong JSON.
    7.  **Kết quả:** Luôn trả về một đối tượng JSON với 3 khóa bắt buộc: \`MucDichCongViec\`, \`MoTaCongViec\`, \`YeuCauCongViec\`.
    
    Văn bản JD thô cần xử lý:
    ---
    ${rawJdText.slice(0, 4000)}
    ---
  `;

  try {
    const response = await generateContentWithFallback(MODEL_NAME, prompt, {
      responseMimeType: "application/json",
      responseSchema: jdSchema,
      temperature: 0, // deterministic
      topP: 0,
      topK: 1,
    });

    const resultJson = JSON.parse(response.text);

    const hasContent = resultJson.MucDichCongViec?.trim() || resultJson.MoTaCongViec?.trim() || resultJson.YeuCauCongViec?.trim();
    if (!hasContent) {
        throw new Error("Không thể trích xuất bất kỳ nội dung có ý nghĩa nào từ JD. Vui lòng kiểm tra file.");
    }

    let formattedString = '';
    if (resultJson.MucDichCongViec?.trim()) {
        formattedString += `### MỤC ĐÍCH CÔNG VIỆC\n${resultJson.MucDichCongViec.trim()}\n\n`;
    }
    if (resultJson.MoTaCongViec?.trim()) {
        formattedString += `### MÔ TẢ CÔNG VIỆC\n${resultJson.MoTaCongViec.trim()}\n\n`;
    }
    if (resultJson.YeuCauCongViec?.trim()) {
        formattedString += `### YÊU CẦU CÔNG VIỆC\n${resultJson.YeuCauCongViec.trim()}\n\n`;
    }

    const finalResult = formattedString.trim();

    return finalResult;

  } catch (error) {
    console.error("Lỗi khi lọc và cấu trúc JD:", error);
    if (error instanceof Error && error.message.includes("Không thể trích xuất")) {
        throw error;
    }
    throw new Error("AI không thể phân tích cấu trúc JD. Vui lòng thử lại.");
  }
};


export const extractJobPositionFromJD = async (jdText: string): Promise<string> => {
  if (!jdText || jdText.trim().length < 20) {
    return '';
  }

  const prompt = `Dựa vào văn bản mô tả công việc sau, trích xuất và trả về CHỈ tên chức danh công việc. Không thêm bất kỳ văn bản, nhãn hoặc giải thích nào khác. Ví dụ: nếu văn bản chứa "Chúng tôi đang tìm kiếm một Senior Frontend Developer", bạn phải trả về "Senior Frontend Developer".
  
  Mô tả công việc:
  ---
  ${jdText.slice(0, 1500)} 
  ---
  `;

  try {
    const response = await generateContentWithFallback(MODEL_NAME, prompt, {
      temperature: 0,
      topP: 0,
      topK: 1,
      thinkingConfig: { thinkingBudget: 0 },
    });

    const position = response.text.trim();
    if (position.length > 0 && position.length < 100) {
      return position;
    }
    return '';
  } catch (error) {
    console.error("Lỗi khi trích xuất chức danh công việc từ AI:", error);
    return '';
  }
};


const detailedScoreSchema = {
    type: Type.OBJECT,
    properties: {
        "Tiêu chí": { type: Type.STRING },
        "Điểm": { type: Type.STRING, description: "Score for the criterion, format: 'score/weight_percentage' (e.g., '12.5/15' for 15% weight)" },
        "Công thức": { type: Type.STRING, description: "Formula used, format: 'subscore X/weight_Y% = X points'" },
        "Dẫn chứng": { type: Type.STRING, description: "Direct quote from the CV as evidence. Must be in Vietnamese." },
        "Giải thích": { type: Type.STRING, description: "Brief explanation of the score. Must be in Vietnamese." },
    },
    required: ["Tiêu chí", "Điểm", "Công thức", "Dẫn chứng", "Giải thích"]
};

const analysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      candidateName: { type: Type.STRING },
      phone: { type: Type.STRING, description: "Candidate's phone number, if found." },
      email: { type: Type.STRING, description: "Candidate's email address, if found." },
      fileName: { type: Type.STRING },
      jobTitle: { type: Type.STRING },
      industry: { type: Type.STRING },
      department: { type: Type.STRING },
      experienceLevel: { type: Type.STRING },
      hardFilterFailureReason: { type: Type.STRING, description: "Reason for failing a mandatory hard filter, in Vietnamese." },
      softFilterWarnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of warnings for non-mandatory filters that were not met, in Vietnamese." },
      detectedLocation: { type: Type.STRING },
      analysis: {
        type: Type.OBJECT,
        properties: {
            "Tổng điểm": { type: Type.INTEGER },
            "Hạng": { type: Type.STRING },
            "Chi tiết": {
                type: Type.ARRAY,
                items: detailedScoreSchema,
            },
            "Điểm mạnh CV": { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3-5 key strengths from the CV." },
            "Điểm yếu CV": { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3-5 key weaknesses from the CV." },
            "educationValidation": {
                type: Type.OBJECT,
                properties: {
                    "standardizedEducation": { type: Type.STRING, description: "Standardized education info format: 'School Name - Degree - Major - Period'" },
                    "validationNote": { type: Type.STRING, description: "'Hợp lệ' or 'Không hợp lệ – cần HR kiểm tra lại'" },
                    "warnings": { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of validation warnings or issues found" }
                },
                required: ["standardizedEducation", "validationNote"]
            },
        },
        required: ["Tổng điểm", "Hạng", "Chi tiết", "Điểm mạnh CV", "Điểm yếu CV"]
      }
    },
    required: ["candidateName", "fileName", "analysis"]
  }
};

const buildCompactCriteria = (weights: WeightCriteria): string => {
    return Object.values(weights).map((c: MainCriterion) => {
        const totalWeight = c.children?.reduce((sum, child) => sum + child.weight, 0) || c.weight || 0;
        return `${c.name}: ${totalWeight}%`;
    }).join('\n');
};

const createAnalysisPrompt = (
    jdText: string,
    weights: WeightCriteria,
    hardFilters: HardFilters
): string => {
    const compactJD = jdText.replace(/\s+/g, ' ').trim().slice(0, 5000);
    const compactWeights = buildCompactCriteria(weights);

    return `
      ANALYZE CVs. Role: Chuyên viên sàng lọc hồ sơ (không phỏng vấn, chỉ phân tích định lượng). Language: VIETNAMESE ONLY. Output: STRICT JSON ARRAY.

      **JOB DESCRIPTION (JD):**
      ${compactJD}

      **SCORING CRITERIA & WEIGHTS:**
      Score these 9 criteria:
      ${compactWeights}

      **FILTERS:**
      Location: ${hardFilters.location || 'N/A'} (Mandatory: ${hardFilters.locationMandatory})
      Min Experience: ${hardFilters.minExp || 'N/A'} years (Mandatory: ${hardFilters.minExpMandatory})
      Seniority: ${hardFilters.seniority || 'N/A'} (Mandatory: ${hardFilters.seniorityMandatory})
      Contact Info: (Mandatory: ${hardFilters.contactMandatory})

      **SCORING METHODOLOGY:**

      **1. Individual Criterion Scores (Chi tiết):**
      - For each of the 9 criteria, evaluate directly on its weight scale
      - If a criterion has weight W%, score it from 0 to W (not 0-100)
      - Example: If "Phù hợp JD" has 15% weight, score it as X/15 where X is 0-15
      - If "Kinh nghiệm" has 20% weight, score it as Y/20 where Y is 0-20
      - Base evaluation on how well the candidate matches the JD requirements

      **2. Subscore = Criterion Score (already weighted):**
      - The criterion score IS the subscore (no multiplication needed)
      - Formula format: "subscore X/weight_Y% = X points"

      **3. Overall Score Calculation:**
      Base score: 100 points.

      **Hard Filters Penalties:**
      - Each mandatory filter violation: -5 points
      - Special 3 filters (Location, Min Experience, Seniority) when mandatory: -10 points each

      **Bonuses:**
      - Experience: If JD requires Y years, candidate has X>Y years → +1 point per extra year, max +5
      - Core Skills Match: +1 point per core skill matched (from JD keywords), max +5
      - Soft Weights: If sliders enabled, normalize to 0-20 points and add

      **EDUCATION INFORMATION PROCESSING:**

      **1. Education Data Extraction:**
      - Extract complete education information: school name, degree, major, study period
      - Standardize format: "Tên trường - Bậc học - Ngành học - Thời gian"

      **2. School Name Validation:**
      - Check if school name exists and is legitimate
      - Flag warnings for non-educational institutions:
        * Job platforms: TopCV, VietnamWorks, FPT Jobs, JobStreet, etc.
        * Company names: FPT Software, Viettel, VNPT, etc.
        * Websites: facebook.com, google.com, etc.
        * Invalid entries: "Không có", "N/A", random text

      **3. Conflict Detection:**
      - If degree level says "university graduate" but school name is a company/job platform
      - If study period is unrealistic (e.g., 50 years)
      - If major doesn't match degree level

      **4. Scoring Impact:**
      - Valid education: Score normally based on relevance to JD
      - Invalid/suspicious education: -50% from normal score
      - Clear conflicts: -80% from normal score

      **5. Output Format:**
      - Standardized education info: "Đại học Bách khoa Hà Nội - Cử nhân - Công nghệ thông tin - 2015-2019"
      - Note: "Hợp lệ" or "Không hợp lệ – cần HR kiểm tra lại"
      - NEVER auto-correct, only flag for HR review

      **OUTPUT RULES (CRITICAL):**
      1. For each CV, create one JSON object matching the schema.
      2. Calculate detailed scores for 9 criteria using their weight scales (e.g., 12.5/15 for 15% weight criterion).
      3. "Tổng điểm" = 100 + Sum of all criterion scores + Bonuses - Penalties, then cap to 0-100.
      4. **"Hạng" based on final "Tổng điểm":**
         - A: 75-100 points (Excellent match)
         - B: 25-74 points (Good match)
         - C: 0-24 points (Poor match)
      5. Keep "Chi tiết" for logging, but UI shows only total.
      6. **MANDATORY FAIL:** If mandatory filter not met, apply penalties and may result in C grade.
      7. If CV unparsable, create FAILED entry.
      8. **IMPORTANT:** Criterion scores should reflect realistic performance on their weight scale!
    `;
};

const getFileContentPart = async (file: File): Promise<{text: string} | null> => {
    try {
        const textContent = await processFileToText(file, () => {});
        const MAX_CHARS = 8000;
        const summarizedText = textContent.length > MAX_CHARS ? textContent.substring(0, MAX_CHARS) + "..." : textContent;
        return { text: `--- CV Content for ${file.name} ---\n${summarizedText}` };
    } catch(e) {
        console.error(`Could not process file ${file.name} for Gemini`, e);
        return null;
    }
};


export async function* analyzeCVs(
  jdText: string,
  weights: WeightCriteria,
  hardFilters: HardFilters,
  cvFiles: File[]
): AsyncGenerator<Candidate | { status: 'progress'; message: string }> {

  const mainPrompt = createAnalysisPrompt(jdText, weights, hardFilters);
  const contents: any[] = [{ text: mainPrompt }];

  for (let i = 0; i < cvFiles.length; i++) {
    const file = cvFiles[i];
    yield { status: 'progress', message: `Đang xử lý tệp ${i + 1}/${cvFiles.length}: ${file.name}` };
    
    const contentPart = await getFileContentPart(file);
    if (contentPart) {
        contents.push(contentPart);
    } else {
        yield {
            id: `${file.name}-error-${Date.now()}`,
            status: 'FAILED' as 'FAILED',
            error: `Không thể đọc tệp. Vui lòng kiểm tra lại định dạng và nội dung tệp.`,
            candidateName: 'Lỗi Xử Lý Tệp',
            fileName: file.name,
            jobTitle: '',
            industry: '',
            department: '',
            experienceLevel: '',
            detectedLocation: '',
            phone: '',
            email: ''
        };
    }
  }

  yield { status: 'progress', message: 'Tất cả các tệp đã được xử lý. Đang gửi đến AI để phân tích...' };
  
  try {
    const response = await generateContentWithFallback(MODEL_NAME, { parts: contents }, {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
      temperature: 0,
      topP: 0,
      topK: 1,
      thinkingConfig: { thinkingBudget: 0 },
    });
    
    yield { status: 'progress', message: 'AI đã phản hồi. Đang hoàn tất...' };

    const resultText = response.text.trim();
    let candidates: Omit<Candidate, 'id' | 'status'>[] = [];
    
    try {
        candidates = JSON.parse(resultText);
    } catch (e) {
        console.error("Lỗi phân tích JSON từ AI:", e);
        console.error("Dữ liệu thô từ AI (500 ký tự đầu):", resultText.substring(0, 500));
        throw new Error("AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
    }
    
  // Stable hash function for deterministic IDs
  const stableHash = (input: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };

  const finalCandidates = candidates.map(c => {
    const basis = `${c.fileName || ''}|${c.candidateName || ''}|${c.jobTitle || ''}|${c.experienceLevel || ''}`;
    return {
      ...c,
      id: `cand_${stableHash(basis)}`,
      status: 'SUCCESS' as 'SUCCESS',
    };
  });

  // Stable ordering: sort by provided total score desc then filename asc
  finalCandidates.sort((a,b) => {
    const sa = typeof a.analysis?.['Tổng điểm'] === 'number' ? a.analysis['Tổng điểm'] : -1;
    const sb = typeof b.analysis?.['Tổng điểm'] === 'number' ? b.analysis['Tổng điểm'] : -1;
    if (sb !== sa) return sb - sa;
    return (a.fileName||'').localeCompare(b.fileName||'');
  });


    for (const candidate of finalCandidates) {
      yield candidate;
    }

  } catch (error) {
     console.error("Lỗi phân tích từ AI:", error);
     const friendlyMessage = "AI không thể hoàn tất phân tích. Vui lòng thử lại sau. (Lỗi giao tiếp với máy chủ AI)";
     throw new Error(friendlyMessage);
  }
}

// --- New Chatbot Service ---

const chatbotResponseSchema = {
  type: Type.OBJECT,
  properties: {
    "responseText": { type: Type.STRING, description: "The natural language response to the user's query." },
    "candidateIds": {
      type: Type.ARRAY,
      description: "An array of candidate IDs that are relevant to the response, if any.",
      items: { type: Type.STRING }
    },
  },
  required: ["responseText", "candidateIds"]
};

export const getChatbotAdvice = async (
  analysisData: AnalysisRunData,
  userInput: string
): Promise<{ responseText: string; candidateIds: string[] }> => {
  const successfulCandidates = analysisData.candidates.filter(c => c.status === 'SUCCESS');
  
  // Sanitize candidate data to remove PII and reduce token count
  const sanitizedCandidates = successfulCandidates.map(c => ({
    id: c.id,
    name: c.candidateName,
    rank: c.analysis?.['Hạng'],
    totalScore: c.analysis?.['Tổng điểm'],
    jdFitPercent: c.analysis?.['Chi tiết']?.find(item => item['Tiêu chí'].startsWith('Phù hợp JD')) 
                  ? parseInt(c.analysis['Chi tiết'].find(item => item['Tiêu chí'].startsWith('Phù hợp JD'))!['Điểm'].split('/')[0], 10) 
                  : 0,
    title: c.jobTitle,
    level: c.experienceLevel
  }));

  const summary = {
      total: successfulCandidates.length,
      countA: successfulCandidates.filter(c => c.analysis?.['Hạng'] === 'A').length,
      countB: successfulCandidates.filter(c => c.analysis?.['Hạng'] === 'B').length,
      countC: successfulCandidates.filter(c => c.analysis?.['Hạng'] === 'C').length,
  };

  const prompt = `
    You are a helpful AI recruitment assistant. Your goal is to help the user analyze and select the best candidates based on the provided data.
    Your language MUST BE Vietnamese.

    **CONTEXT DATA:**
    - Job Position: ${analysisData.job.position}
    - Summary: ${JSON.stringify(summary)}
    - Candidate List (sanitized): ${JSON.stringify(sanitizedCandidates.slice(0, 20))}
    
    **USER QUERY:** "${userInput}"

    **YOUR TASKS:**
    1.  Analyze the user's query and the context data.
    2.  Provide a concise, helpful, and natural response in Vietnamese.
    3.  If the query asks you to suggest, filter, or identify candidates, you MUST include their unique 'id' values in the 'candidateIds' array in your JSON output.
    4.  If no specific candidates are relevant, return an empty 'candidateIds' array.
    5.  Common queries to handle:
        - "suggest", "gợi ý": Find the top candidates based on criteria like rank, score, or jdFit.
        - "compare", "so sánh": Provide a brief comparison of specified candidates.
        - "interview questions", "câu hỏi phỏng vấn": Generate relevant interview questions for a candidate or for the role in general.

    **OUTPUT FORMAT:**
    You must respond with a single, valid JSON object that matches this schema:
    {
      "responseText": "Your Vietnamese language answer here.",
      "candidateIds": ["id-of-candidate-1", "id-of-candidate-2", ...]
    }
  `;

  try {
    const aiInstance = getAi();
    const response = await generateContentWithFallback(MODEL_NAME, prompt, {
      responseMimeType: "application/json",
      responseSchema: chatbotResponseSchema,
      temperature: 0, // deterministic responses (can adjust later if creative variance desired)
      topP: 0,
      topK: 1,
    });

    return JSON.parse(response.text);

  } catch (error) {
    console.error("Error getting chatbot advice from AI:", error);
    throw new Error("AI chatbot is currently unavailable.");
  }
};

// Single-Tab Action Logic cho Gemini
// Đảm bảo chỉ 1 tab thực thi hành động tại 1 thời điểm

const LOCK_NAME = "gemini-action-lock";
const CHANNEL_NAME = "gemini_action_channel";
const LOCK_TTL = 10000; // 10s
const HEARTBEAT_INTERVAL = 2000; // 2s
const LOCK_KEY = "gemini_action_lock";

let tabId = generateTabId();
let heartbeatTimer: number | null = null;
let isLocked = false;
let broadcastChannel: BroadcastChannel | null = null;

function generateTabId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function supportsWebLocks(): boolean {
  return 'locks' in navigator;
}

function createBroadcastChannel(): BroadcastChannel | null {
  if ('BroadcastChannel' in window) {
    return new BroadcastChannel(CHANNEL_NAME);
  }
  return null;
}

function broadcastStatus(busy: boolean) {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: "status", payload: { busy } });
  }
}

function updateUI(busy: boolean, isSelf: boolean = false) {
  const btn = document.querySelector('#btn') as HTMLButtonElement;
  const status = document.querySelector('#status') as HTMLElement;
  if (btn) {
    btn.disabled = busy;
  }
  if (status) {
    if (busy) {
      status.textContent = isSelf ? "Đang xử lý tại tab này…" : "Đang xử lý ở tab khác…";
    } else {
      status.textContent = "Sẵn sàng";
    }
  }
}

async function performAction(): Promise<void> {
  // Stub: Gọi backend proxy đến Gemini
  // Không lộ API key, gọi qua endpoint backend
  try {
    const response = await fetch('/api/proxy-to-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* data */ })
    });
    if (!response.ok) throw new Error('API failed');
    // Xử lý kết quả
  } catch (error) {
    console.error('performAction error:', error);
    throw error;
  }
}

async function runExclusive(fn: () => Promise<void>): Promise<void> {
  if (supportsWebLocks()) {
    return navigator.locks.request(LOCK_NAME, { mode: "exclusive" }, async (lock) => {
      if (lock) {
        broadcastStatus(true);
        updateUI(true, true);
        try {
          await fn();
        } finally {
          broadcastStatus(false);
          updateUI(false);
        }
      } else {
        updateUI(true, false);
      }
    });
  } else {
    return fallbackRunExclusive(fn);
  }
}

async function fallbackRunExclusive(fn: () => Promise<void>): Promise<void> {
  if (tryAcquireLock()) {
    broadcastStatus(true);
    updateUI(true, true);
    startHeartbeat();
    try {
      await fn();
    } finally {
      stopHeartbeat();
      releaseLock();
      broadcastStatus(false);
      updateUI(false);
    }
  } else {
    updateUI(true, false);
  }
}

function tryAcquireLock(): boolean {
  const now = Date.now();
  const lockData = localStorage.getItem(LOCK_KEY);
  if (lockData) {
    const lock = JSON.parse(lockData);
    if (lock.owner !== tabId && lock.expiresAt > now) {
      return false; // Lock đang sống và không phải của tab này
    }
  }
  // Chiếm lock
  localStorage.setItem(LOCK_KEY, JSON.stringify({ owner: tabId, expiresAt: now + LOCK_TTL }));
  isLocked = true;
  return true;
}

function renewLock() {
  const now = Date.now();
  const lockData = localStorage.getItem(LOCK_KEY);
  if (lockData) {
    const lock = JSON.parse(lockData);
    if (lock.owner === tabId) {
      localStorage.setItem(LOCK_KEY, JSON.stringify({ owner: tabId, expiresAt: now + LOCK_TTL }));
    }
  }
}

function releaseLock() {
  const lockData = localStorage.getItem(LOCK_KEY);
  if (lockData) {
    const lock = JSON.parse(lockData);
    if (lock.owner === tabId) {
      localStorage.removeItem(LOCK_KEY);
    }
  }
  isLocked = false;
}

function startHeartbeat() {
  heartbeatTimer = window.setInterval(renewLock, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function bindUI() {
  broadcastChannel = createBroadcastChannel();
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === "status") {
        updateUI(payload.busy, false);
      }
    };
  }

  // Lắng nghe storage event cho fallback nếu không có BroadcastChannel
  if (!broadcastChannel) {
    window.addEventListener('storage', (event) => {
      if (event.key === LOCK_KEY) {
        const lockData = event.newValue;
        if (lockData) {
          const lock = JSON.parse(lockData);
          const busy = lock.owner !== tabId && lock.expiresAt > Date.now();
          updateUI(busy, false);
        } else {
          updateUI(false, false);
        }
      }
    });
  }

  // Giải phóng lock khi tab unload
  window.addEventListener('beforeunload', () => {
    if (isLocked) {
      releaseLock();
      broadcastStatus(false);
    }
  });

  // Khởi tạo UI
  updateUI(false);
}

// Xuất các hàm cần thiết
export { runExclusive, bindUI, performAction };
