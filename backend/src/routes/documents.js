const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { compileCourseMaterial } = require('../compileCourse');
const { generateCourseDescription } = require('../generateCourseDescription');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX and TXT files are allowed'));
    }
  },
});

async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    return new Promise((resolve, reject) => {
      const parser = new PDFParser(null, 1);
      parser.on('pdfParser_dataReady', pdfData => {
        resolve(parser.getRawTextContent());
      });
      parser.on('pdfParser_dataError', err => reject(err));
      parser.loadPDF(filePath);
    });
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  }

  return '';
}

// POST /api/courses/:id/documents - upload document to course
router.post('/:id/documents', authMiddleware, requireRole('parent'), upload.single('file'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.parent_id !== req.user.id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You do not own this course' });
    }

    let extracted_text = '';
    try {
      extracted_text = await extractText(req.file.path, req.file.originalname);
    } catch (extractErr) {
      console.error('Text extraction error:', extractErr);
      extracted_text = '';
    }

    const [doc] = await db('section_documents')
      .insert({
        course_id: id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        extracted_text,
      })
      .returning(['id', 'course_id', 'filename', 'original_name', 'created_at']);

    // Trigger async recompilation (don't await – respond immediately)
    compileCourseMaterial(id).catch(err => console.error('Compile error after upload:', err));
    generateCourseDescription(id).catch(err => console.error('Description error after upload:', err));

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Upload document error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/:id/documents - list documents for a course
router.get('/:id/documents', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const documents = await db('section_documents')
      .where({ course_id: id })
      .select('id', 'course_id', 'filename', 'original_name', 'created_at')
      .orderBy('created_at', 'asc');

    return res.json(documents);
  } catch (err) {
    console.error('Get documents error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/documents/:id - delete a document
router.delete('/documents/:id', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await db('section_documents').where({ id }).first();
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const course = await db('courses').where({ id: doc.course_id }).first();

    if (course.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this document' });
    }

    const filePath = path.join(__dirname, '../../uploads', doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db('section_documents').where({ id }).delete();

    // Recompile remaining docs
    compileCourseMaterial(doc.course_id).catch(err => console.error('Compile error after delete:', err));
    generateCourseDescription(doc.course_id).catch(err => console.error('Description error after delete:', err));

    return res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
