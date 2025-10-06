import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';
import { cvCache } from './cacheService';

// Set the workerSrc for pdf.js. This is crucial for it to work from a CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/build/pdf.worker.min.mjs`;

const FILE_SIZE_LIMIT_MB = 15;
const MIN_PDF_TEXT_LENGTH = 200; // Increased threshold to avoid unnecessary OCR
const MAX_OCR_PAGES = 2; // Reduced from 3 to 2 pages for faster processing
const CANVAS_SCALE = 1.5; // Reduced from 2.0 for better performance

// Validation and normalization utilities
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /(\+84|84|0)[3|5|7|8|9][0-9]{8}\b/;
const DATE_REGEX = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;

const SYNONYM_MAP: Record<string, string[]> = {
  'Hà Nội': ['Ha Noi', 'Hanoi', 'HN'],
  'Hồ Chí Minh': ['Ho Chi Minh', 'HCM', 'Sài Gòn', 'Saigon'],
  'Cử nhân': ['BSc', 'Bachelor', 'Cử nhân Đại học'],
  'Thạc sĩ': ['MSc', 'Master', 'Thạc sĩ'],
  'Tiến sĩ': ['PhD', 'Doctor', 'Tiến sĩ'],
  'Kỹ sư': ['Engineer', 'Kỹ sư'],
  'Quản lý': ['Manager', 'Quản lý'],
};

export interface ParsedField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
  validationErrors?: string[];
}

export interface ParsedCV {
  name?: ParsedField;
  email?: ParsedField;
  phone?: ParsedField;
  location?: ParsedField;
  experience?: ParsedField;
  education?: ParsedField;
  skills?: ParsedField;
  rawText: string;
}

export const parseCVFields = async (text: string): Promise<ParsedCV> => {
  const normalizedText = normalizeText(text);

  // Basic layout detection - look for common section headers
  const sections = detectSections(normalizedText);

  const result: ParsedCV = {
    rawText: normalizedText,
  };

  // Extract fields with validation
  result.name = extractField(sections, ['name', 'full name', 'họ tên', 'tên'], (value) => ({
    value: normalizeName(value),
    confidence: 'high' as const
  }));

  result.email = extractField(sections, ['email', 'e-mail', 'mail'], (value) => {
    const emails = value.match(EMAIL_REGEX);
    if (emails) {
      return {
        value: emails[0],
        confidence: 'high' as const
      };
    }
    return {
      value,
      confidence: 'low' as const,
      validationErrors: ['Invalid email format']
    };
  });

  result.phone = extractField(sections, ['phone', 'tel', 'mobile', 'điện thoại', 'sđt'], (value) => {
    const phones = value.match(PHONE_REGEX);
    if (phones) {
      return {
        value: phones[0],
        confidence: 'high' as const
      };
    }
    return {
      value,
      confidence: 'low' as const,
      validationErrors: ['Invalid phone format']
    };
  });

  result.location = extractField(sections, ['location', 'address', 'địa chỉ', 'địa điểm'], (value) => ({
    value: normalizeLocation(value),
    confidence: 'medium' as const
  }));

  result.experience = extractField(sections, ['experience', 'kinh nghiệm', 'làm việc'], (value) => ({
    value,
    confidence: 'medium' as const
  }));

  result.education = extractField(sections, ['education', 'học vấn', 'học vấn', 'bằng cấp'], (value) => ({
    value: normalizeEducation(value),
    confidence: 'medium' as const
  }));

  result.skills = extractField(sections, ['skills', 'kỹ năng', 'chuyên môn'], (value) => ({
    value,
    confidence: 'medium' as const
  }));

  return result;
};

const detectSections = (text: string): Record<string, string> => {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();

    // Check if line looks like a section header
    if (lowerLine.match(/^(name|email|phone|location|experience|education|skills|kinh nghiệm|học vấn|kỹ năng|họ tên|điện thoại|địa chỉ)/i)) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }

      currentSection = lowerLine;
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n');
  }

  return sections;
};

const extractField = (
  sections: Record<string, string>,
  keywords: string[],
  processor: (value: string) => ParsedField
): ParsedField | undefined => {
  for (const keyword of keywords) {
    for (const [sectionName, content] of Object.entries(sections)) {
      if (sectionName.includes(keyword.toLowerCase())) {
        const trimmed = content.trim();
        if (trimmed) {
          return processor(trimmed);
        }
      }
    }
  }
  return undefined;
};

const normalizeName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

const normalizeLocation = (location: string): string => {
  let normalized = location.trim();

  // Apply synonym normalization
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
      if (regex.test(normalized)) {
        normalized = normalized.replace(regex, canonical);
        break;
      }
    }
  }

  return normalized;
};

const normalizeEducation = (education: string): string => {
  let normalized = education.trim();

  // Apply synonym normalization
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
      normalized = normalized.replace(regex, canonical);
    }
  }

  return normalized;
};

/**
 * Normalizes extracted text by fixing line breaks and whitespace.
 */
const normalizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n') // Standardize line endings
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces/tabs
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines to a paragraph break
    .trim();
};

/**
 * Checks if PDF text content is sufficient or if OCR is needed
 */
const isTextContentSufficient = (text: string, minLength: number = MIN_PDF_TEXT_LENGTH): boolean => {
  // Check for meaningful text content (not just symbols or short fragments)
  const meaningfulText = text.replace(/[^\w\s]/g, '').trim();
  return meaningfulText.length >= minLength;
};

/**
 * Optimized OCR function with better performance settings
 */
const performOptimizedOCR = async (canvas: HTMLCanvasElement): Promise<string> => {
  try {
    const result = await Tesseract.recognize(canvas, 'eng+vie');
    return result.data.text;
  } catch (error) {
    console.warn('OCR failed, returning empty string:', error);
    return '';
  }
};

/**
 * Extracts text from a given file (PDF, DOCX, or Image).
 * Handles PDF text layers with an optimized OCR fallback for scanned documents.
 * @param file The file to process.
 * @param onProgress A callback to report progress messages.
 * @returns A promise that resolves to the extracted text.
 */
export const extractTextFromFile = async (
  file: File,
  onProgress: (message: string) => void
): Promise<string> => {
  if (file.size > FILE_SIZE_LIMIT_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${FILE_SIZE_LIMIT_MB}MB.`);
  }

  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Check cache first
  const cachedText = cvCache.get<string>(file, 'text-extraction');
  if (cachedText) {
    onProgress('Đang tải từ cache...');
    return cachedText;
  }

  let rawText = '';

  try {
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      onProgress('Đang đọc file PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let textLayerContent = '';
      // Read first few pages for text content check
      const pagesToCheck = Math.min(3, pdf.numPages);
      for (let i = 1; i <= pagesToCheck; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        textLayerContent += textContent.items.map(item => (item as any).str).join(' ') + '\n';
      }

      // If text layer has sufficient content, use it; otherwise OCR
      if (isTextContentSufficient(textLayerContent)) {
        // Read all pages for text content
        for (let i = 1; i <= pdf.numPages; i++) {
          if (i > pagesToCheck) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            textLayerContent += textContent.items.map(item => (item as any).str).join(' ') + '\n';
          }
        }
        rawText = textLayerContent;
        onProgress('Đã trích xuất text từ PDF thành công');
      } else {
        onProgress('PDF là ảnh scan, đang dùng OCR tối ưu...');
        let ocrText = '';
        const numPagesToOcr = Math.min(MAX_OCR_PAGES, pdf.numPages);

        // Process pages sequentially for better memory management
        for (let i = 1; i <= numPagesToOcr; i++) {
          onProgress(`Đang OCR trang ${i}/${numPagesToOcr}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: CANVAS_SCALE });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true });

          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            const pageText = await performOptimizedOCR(canvas);
            ocrText += pageText + '\n\n';
          }
        }
        rawText = ocrText;
        onProgress('Đã hoàn thành OCR');
      }

    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      onProgress('Đang đọc file DOCX...');
      const arrayBuffer = await file.arrayBuffer();
      const result = await (mammoth as any).extractRawText({ arrayBuffer });
      rawText = result.value;
      onProgress('Đã đọc file DOCX thành công');

    } else if (fileType.startsWith('image/')) {
      onProgress('Đang OCR ảnh...');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Resize image for better OCR performance
          const maxWidth = 1200;
          const maxHeight = 1600;
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(void 0);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      rawText = await performOptimizedOCR(canvas);
      onProgress('Đã OCR ảnh thành công');

    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      rawText = await file.text();
      onProgress('Đã đọc file text');
    } else {
      throw new Error(`Định dạng file không được hỗ trợ: ${file.name}`);
    }

    const normalizedText = normalizeText(rawText);

    // Cache the result
    cvCache.set(file, normalizedText, 'text-extraction');

    return normalizedText;

  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Lỗi xử lý file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Legacy exports for backward compatibility
export const extractTextFromJdFile = extractTextFromFile;
export const processFileToText = extractTextFromFile;