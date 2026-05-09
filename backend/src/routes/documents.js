const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// Shared in-memory document store
const getDocStore = () => {
  try { return require('./ai').docStore; } catch(e) { return new Map(); }
};

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type. Use PDF, image (JPG/PNG), or TXT.'));
  }
});

// ============================================================
// OCR using GPT-4o Vision API
// ============================================================
async function ocrWithVision(filePath, mimeType) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  const baseURL = (process.env.OPENAI_BASE_URL || '').trim();
  if (!apiKey || apiKey.length < 20) throw new Error('No API key for OCR');

  const { OpenAI } = require('openai');
  const openai = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    defaultHeaders: baseURL?.includes('openrouter') ? {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Study Partner'
    } : {}
  });

  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: baseURL?.includes('openrouter') ? 'openai/gpt-4o' : 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `You are an expert OCR system. Extract ALL text visible in this image/document page with perfect accuracy.

Instructions:
- Extract every word, number, formula, heading, and label visible
- Preserve the structure (headings, bullet points, numbered lists)
- If there are diagrams, describe them briefly with [DIAGRAM: description]
- Include handwritten text (even if messy — do your best)
- Include printed/typed text  
- Preserve math formulas in readable format
- Return ONLY the extracted content, no commentary`
        },
        {
          type: 'image_url',
          image_url: { url: dataUrl, detail: 'high' }
        }
      ]
    }],
    max_tokens: 4000
  });
  return response.choices[0].message.content || '';
}

// ============================================================
// Convert PDF pages to images and OCR each
// ============================================================
async function ocrPdf(filePath) {
  const { createCanvas } = require('canvas');
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  // Disable worker for Node.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdfDoc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const totalPages = pdfDoc.numPages;
  const maxPages = Math.min(totalPages, 8); // process up to 8 pages

  console.log(`📄 OCR: Processing ${maxPages}/${totalPages} pages via Vision API...`);

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to JPEG buffer → base64 → vision OCR
    const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    const base64 = jpegBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    const baseURL = (process.env.OPENAI_BASE_URL || '').trim();
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
      defaultHeaders: baseURL?.includes('openrouter') ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'AI Study Partner' } : {}
    });

    const response = await openai.chat.completions.create({
      model: baseURL?.includes('openrouter') ? 'openai/gpt-4o' : 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract ALL text from this document page (page ${pageNum} of ${totalPages}). Include handwritten text, printed text, formulas, headings, bullet points, labels. Preserve structure. Return only extracted text.`
          },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
        ]
      }],
      max_tokens: 4000
    });

    const pageText = response.choices[0].message.content || '';
    pageTexts.push(`--- Page ${pageNum} ---\n${pageText}`);
    console.log(`✅ Page ${pageNum} OCR'd: ${pageText.length} chars`);
  }

  return pageTexts.join('\n\n');
}

// ============================================================
// UPLOAD + PARSE DOCUMENT (with OCR fallback)
// ============================================================
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let extractedText = '';
    let ocrUsed = false;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const isImage = imageExts.includes(ext);

    if (ext === '.txt') {
      extractedText = fs.readFileSync(req.file.path, 'utf-8');
    } else if (isImage) {
      // Direct image upload — OCR immediately with vision
      const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.bmp': 'image/bmp' };
      try {
        console.log('🖼️ Image uploaded — running Vision OCR...');
        extractedText = await ocrWithVision(req.file.path, mimeMap[ext]);
        ocrUsed = true;
        console.log(`✅ Image OCR complete: ${extractedText.length} chars`);
      } catch(e) {
        console.warn('⚠️ Image OCR failed:', e.message);
        extractedText = '';
      }
    } else if (ext === '.pdf') {
      // Step 1: Try standard text extraction
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        extractedText = (data.text || '').replace(/\s+/g, ' ').trim();
        console.log(`📄 pdf-parse extracted: ${extractedText.length} chars`);
      } catch(e) {
        console.warn('pdf-parse error:', e.message);
      }

      // Step 2: If no/little text found, use Vision OCR (for scanned/handwritten PDFs)
      if (extractedText.length < 100) {
        console.log('📸 Low text PDF — attempting Vision OCR (pdfjs + GPT-4o)...');
        try {
          extractedText = await ocrPdf(req.file.path);
          ocrUsed = true;
          console.log(`✅ PDF OCR complete: ${extractedText.length} chars`);
        } catch(e) {
          console.warn('⚠️ PDF OCR failed:', e.message);
          // Try treating first page as image directly
          try {
            console.log('🔄 Fallback: trying direct vision on PDF...');
            extractedText = await ocrWithVision(req.file.path, 'application/pdf');
            ocrUsed = true;
          } catch(e2) {
            console.warn('⚠️ Vision fallback also failed:', e2.message);
          }
        }
      }
    }

    extractedText = extractedText.trim().substring(0, 80000);

    const docId = Date.now().toString();
    const docData = {
      _id: docId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      extractedText,
      processed: extractedText.length > 50,
      ocrUsed,
      fileType: isImage ? 'image' : ext.slice(1),
      createdAt: new Date()
    };

    // Save to MongoDB
    let savedDoc = null;
    try {
      const Document = require('../models/Document');
      savedDoc = await Document.create({ user: req.userId, ...docData, extractedText: extractedText.substring(0, 50000) });
      docData._id = savedDoc._id.toString();
    } catch(e) {
      console.log('MongoDB unavailable, using in-memory:', e.message);
    }

    // Always save to in-memory store
    const docStore = getDocStore();
    docStore.set(docData._id, { ...docData, user: req.userId });

    const responseDoc = savedDoc || docData;

    let message;
    if (extractedText.length > 50) {
      message = ocrUsed
        ? `✅ OCR complete — extracted ${extractedText.length.toLocaleString()} characters from ${isImage ? 'image' : 'scanned document'}`
        : `✅ Text extracted — ${extractedText.length.toLocaleString()} characters ready for AI analysis`;
    } else {
      message = '⚠️ Could not extract text. Try uploading as a clearer image (JPG/PNG) for better OCR results.';
    }

    res.status(201).json({
      document: {
        _id: responseDoc._id,
        originalName: responseDoc.originalName,
        filename: responseDoc.filename,
        size: responseDoc.size,
        processed: docData.processed,
        ocrUsed,
        fileType: docData.fileType,
        textLength: extractedText.length,
        createdAt: responseDoc.createdAt
      },
      message
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LIST DOCUMENTS
// ============================================================
router.get('/', auth, async (req, res) => {
  try {
    let docs = [];
    try {
      const Document = require('../models/Document');
      docs = await Document.find({ user: req.userId }).select('-extractedText').sort({ createdAt: -1 });
    } catch(e) {}

    const docStore = getDocStore();
    const dbIds = new Set(docs.map(d => d._id.toString()));
    for (const [id, doc] of docStore.entries()) {
      if (doc.user === req.userId && !dbIds.has(id)) {
        docs.unshift({ _id: id, originalName: doc.originalName, filename: doc.filename, size: doc.size, processed: doc.processed, ocrUsed: doc.ocrUsed, createdAt: doc.createdAt });
      }
    }
    res.json(docs);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET SINGLE DOCUMENT
// ============================================================
router.get('/:id', auth, async (req, res) => {
  try {
    let doc = null;
    try { const Document = require('../models/Document'); doc = await Document.findOne({ _id: req.params.id, user: req.userId }); } catch(e) {}
    if (!doc) { const inMem = getDocStore().get(req.params.id); if (inMem && inMem.user === req.userId) doc = inMem; }
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// DELETE DOCUMENT
// ============================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    let filePath = null;
    try { const Document = require('../models/Document'); const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.userId }); if (doc) filePath = doc.path; } catch(e) {}
    const inMem = getDocStore().get(req.params.id);
    if (inMem) { filePath = filePath || inMem.path; getDocStore().delete(req.params.id); }
    if (filePath) { try { fs.unlinkSync(filePath); } catch(e) {} }
    res.json({ message: 'Document deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
