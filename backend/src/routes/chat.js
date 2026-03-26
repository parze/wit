const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/chat/:courseId  (students enrolled in the course, or the teacher who owns it)
router.post('/:courseId', authMiddleware, async (req, res) => {
  const { courseId } = req.params;
  const { message, intro } = req.body;

  if (!intro && (!message || !message.trim())) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const isTeacher = req.user.role === 'teacher';

  try {
    const t0 = Date.now();
    const lap = (label) => process.stderr.write(`[chat] ${label}: ${Date.now() - t0}ms\n`);

    const course = await db('courses').where({ id: courseId }).first();
    lap('db: course');
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (isTeacher) {
      // Teachers may only test their own courses
      if (course.teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Not your course' });
      }
    } else {
      const enrollment = await db('enrollments')
        .where({ student_id: req.user.id, course_id: courseId })
        .first();
      lap('db: enrollment');
      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }

    // Use compiled_material if available, otherwise fall back to raw extracted_text
    let courseMaterial = course.compiled_material;
    if (!courseMaterial) {
      const documents = await db('section_documents')
        .where({ course_id: courseId })
        .select('extracted_text', 'original_name');
      courseMaterial = documents
        .map((doc) => `[${doc.original_name}]\n${doc.extracted_text || ''}`)
        .join('\n\n');
      lap('db: documents (no compiled_material)');
    }

    process.stderr.write(`[chat] system prompt length: ${courseMaterial?.length ?? 0} chars\n`);

    const BASE_CHAT_PROMPT = `Du är en hjälpsam AI-lärare. Svara på elevens frågor baserat ENBART på kursmaterialet nedan. Om eleven frågar om något som inte finns i kursmaterialet, vägled dem tillbaka till ämnet på ett vänligt sätt.`;

    let chatPrompt = BASE_CHAT_PROMPT;
    const enableQuickReplies = !!course.enable_quick_replies;
    if (course.instruction_id) {
      const instruction = await db('course_instructions').where({ id: course.instruction_id }).first();
      lap('db: instruction');
      if (instruction?.chat_prompt) chatPrompt = instruction.chat_prompt;
    }

    const systemPrompt = `${chatPrompt}\n\n--- KURSMATERIAL ---\n${courseMaterial}\n--------------------`;

    // Load existing chat session or start fresh
    const existingSession = await db('chat_sessions')
      .where({ student_id: req.user.id, course_id: courseId })
      .first();
    lap('db: chat_session');

    const messages = existingSession ? existingSession.messages : [];
    process.stderr.write(`[chat] history length: ${messages.length} messages\n`);

    // For intro requests don't add a visible user turn – just ask AI to open the lesson
    const introPrompt = `Du ska nu hälsa eleven välkommen och inleda lektionen. Presentera dig kort och berätta vad kursen "${course.title}" handlar om baserat på kursmaterialet. Var varm, engagerande och kortfattad – max 3–4 meningar. Avsluta med en inbjudande fråga som får eleven att börja tänka på ämnet.`;
    if (intro) {
      messages.push({ role: 'user', content: introPrompt });
    } else {
      messages.push({ role: 'user', content: message.trim() });
    }

    // Keep only the last 20 messages to avoid unbounded history growth
    const trimmedMessages = messages.length > 20 ? messages.slice(-20) : messages;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream Claude response
    const claudeStart = Date.now();
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: trimmedMessages,
    });

    let assistantMessage = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        assistantMessage += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const final = await stream.finalMessage();
    const u = final.usage;
    process.stderr.write(`[chat] claude: ${Date.now() - claudeStart}ms (in: ${u?.input_tokens}, out: ${u?.output_tokens}, cache_read: ${u?.cache_read_input_tokens ?? 0}, cache_write: ${u?.cache_creation_input_tokens ?? 0})\n`);

    // For intro: pop the hidden prompt and only keep the assistant greeting
    if (intro) messages.pop();
    messages.push({ role: 'assistant', content: assistantMessage });

    // Upsert chat session
    if (existingSession) {
      await db('chat_sessions')
        .where({ student_id: req.user.id, course_id: courseId })
        .update({ messages: JSON.stringify(messages), updated_at: db.fn.now() });
    } else {
      await db('chat_sessions').insert({
        student_id: req.user.id,
        course_id: courseId,
        messages: JSON.stringify(messages),
      });
    }
    lap('db: save session');

    // Track student progress (skip for teachers testing their own course)
    if (!isTeacher) {
      const existingProgress = await db('section_progress')
        .where({ student_id: req.user.id, course_id: courseId })
        .first();

      if (existingProgress) {
        if (existingProgress.status === 'not_started') {
          await db('section_progress')
            .where({ student_id: req.user.id, course_id: courseId })
            .update({ status: 'in_progress', updated_at: db.fn.now() });
        }
      } else {
        await db('section_progress').insert({
          student_id: req.user.id,
          course_id: courseId,
          status: 'in_progress',
        });
      }
      lap('db: progress');
    }

    lap('TOTAL (before response)');

    res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);

    // Run analysis + quick replies async, emit results via socket.io when done
    const studentId = req.user.id;
    const io = req.app.get('io');
    const toc = Array.isArray(course.compiled_toc)
      ? course.compiled_toc
      : (course.compiled_toc ? JSON.parse(course.compiled_toc) : []);

    (async () => {
      try {
        const tocLine = toc.length > 0
          ? `\nArbetsområdets Moment (i ordning): ${JSON.stringify(toc)}\n`
          : '';

        // Run analysis and quick replies in parallel
        const analysisPromise = anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: `Analysera elevens chatthistorik och avgör vilka Moment i arbetsområdet som är avklarade.
${tocLine}
Returnera ENDAST giltig JSON:
{
  "currentSection": "namnet på Momentet eleven jobbar på nu, eller tom sträng",
  "completedSections": ["Moment1", "Moment2"],
  "summary": "kort mening om vad eleven kan hittills",
  "reasons": "kort motivering till bedömningen"
}

Chatthistorik: ${JSON.stringify(messages)}`,
            },
          ],
        });

        const quickRepliesPromise = (enableQuickReplies && !intro)
          ? anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 256,
              messages: [
                {
                  role: 'user',
                  content: `AI-läraren ställde en fråga till eleven nedan. Ge exakt 3 svarsalternativ på svenska:\n1. Ett helt korrekt svar\n2. Ett nästan korrekt svar (delvis rätt men innehåller ett vanligt missförstånd)\n3. Ett felaktigt svar\n\nAlternativen ska vara korta (max 10 ord), blandade i slumpmässig ordning så eleven inte vet vilket som är rätt. Returnera ENDAST en JSON-array med 3 strings, inga förklaringar.\n\nAI:ns fråga: ${assistantMessage}`,
                },
              ],
            }).then(r => {
              const text = r.content[0].text.trim();
              const match = text.match(/\[[\s\S]*\]/);
              return match ? JSON.parse(match[0]) : [];
            }).catch(() => [])
          : Promise.resolve(null); // null = feature off, don't emit

        const [analysisResponse, quickReplies] = await Promise.all([analysisPromise, quickRepliesPromise]);

        const analysisText = analysisResponse.content[0].text.trim();
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;

        const analysisResult = JSON.parse(jsonMatch[0]);
        const completedSections = Array.isArray(analysisResult.completedSections)
          ? analysisResult.completedSections
          : [];
        const goalAchievement = toc.length > 0
          ? Math.round((completedSections.length / toc.length) * 100)
          : 0;

        const summaryData = {
          summary: analysisResult.summary || '',
          goal_achievement: goalAchievement,
          reasons: analysisResult.reasons || '',
          current_section: analysisResult.currentSection || '',
          completed_sections: JSON.stringify(completedSections),
        };

        const existingSummary = await db('ai_summaries')
          .where({ student_id: studentId, course_id: courseId })
          .first();

        if (existingSummary) {
          await db('ai_summaries')
            .where({ student_id: studentId, course_id: courseId })
            .update({ ...summaryData, updated_at: db.fn.now() });
        } else {
          await db('ai_summaries').insert({
            student_id: studentId,
            course_id: courseId,
            ...summaryData,
          });
        }

        io.to(`student:${studentId}`).emit('analysis_complete', {
          goalAchievement,
          summary: summaryData.summary,
          reasons: summaryData.reasons,
          currentSection: summaryData.current_section,
          completedSections,
          toc,
        });

        if (quickReplies !== null) {
          io.to(`student:${studentId}`).emit('quick_replies', { quickReplies });
        }
      } catch (analysisErr) {
        console.error('Analysis error:', analysisErr);
      } finally {
        res.end();
      }
    })();

    return;
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    res.end();
  }
});

module.exports = router;
