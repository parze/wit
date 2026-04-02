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

    const DEFAULT_QUIZ_PROMPT = `Du är en provledare som testar elevens kunskaper om kursmaterialet. Svara ENBART baserat på kursmaterialet nedan.

Regler:
- Ställ EN fråga i taget om det angivna Momentet
- Variera frågetyper: faktafrågor, förståelsefrågor och tillämpningsfrågor
- Eleven har EN chans att svara – inga följdfrågor eller ledtrådar
- När eleven svarat: ge kortfattad feedback och skriv [QUIZ_POÄNG:X.XX] på en EGEN rad allra sist (0.0=helt fel, 0.5=delvis rätt, 1.0=perfekt)
- Skriv ALDRIG [QUIZ_POÄNG] i samma svar som du ställer en ny fråga
- Håll en professionell men uppmuntrande ton`;

    let chatPrompt = BASE_CHAT_PROMPT;
    let quizPrompt = DEFAULT_QUIZ_PROMPT;
    const enableQuickReplies = !!course.enable_quick_replies;
    if (course.instruction_id) {
      const instruction = await db('course_instructions').where({ id: course.instruction_id }).first();
      lap('db: instruction');
      if (instruction?.chat_prompt) chatPrompt = instruction.chat_prompt;
      if (instruction?.quiz_prompt) quizPrompt = instruction.quiz_prompt;
    }

    // Resolve TOC (used by both quiz and learn mode)
    const toc = Array.isArray(course.compiled_toc)
      ? course.compiled_toc
      : (course.compiled_toc ? JSON.parse(course.compiled_toc) : []);

    // ── QUIZ MODE ────────────────────────────────────────────────────────────
    if (req.body.mode === 'quiz') {
      const quizSystemPrompt = `${quizPrompt}\n\n--- KURSMATERIAL ---\n${courseMaterial}\n--------------------`;

      const existingSession = await db('chat_sessions')
        .where({ student_id: req.user.id, course_id: courseId })
        .first();
      lap('db: quiz_session');

      const quizMessages = existingSession?.quiz_messages || [];

      const quizSummary = !isTeacher
        ? await db('ai_summaries')
            .where({ student_id: req.user.id, course_id: courseId })
            .select('quiz_answered_sections', 'quiz_score')
            .first()
        : null;
      lap('db: quiz_summary');

      const answeredSections = Array.isArray(quizSummary?.quiz_answered_sections)
        ? quizSummary.quiz_answered_sections
        : (quizSummary?.quiz_answered_sections ? JSON.parse(quizSummary.quiz_answered_sections) : []);

      const answeredMoments = answeredSections.map((s) => s.moment);
      const currentMoment = toc.find((m) => !answeredMoments.includes(m)) || null;
      const currentIndex = toc.indexOf(currentMoment);
      const nextMoment = currentIndex >= 0 && currentIndex < toc.length - 1 ? toc[currentIndex + 1] : null;

      // Build message list for this turn
      const msgs = [...quizMessages];
      if (intro) {
        msgs.push({ role: 'user', content: `[Quizintro: Presentera att detta är ett prov om "${course.title}". Eleven får en fråga per Moment och har en chans att svara. Skriv INTE [QUIZ_POÄNG] i detta svar. Ställ direkt den första frågan om Moment "${currentMoment}".]` });
      } else {
        msgs.push({ role: 'user', content: message.trim() });
      }

      const trimmedMsgs = msgs.length > 20 ? msgs.slice(-20) : msgs;

      const sonnetMsgs = (currentMoment && !intro)
        ? [
            { role: 'user', content: `[Quizkontext: Eleven svarade nu på frågan om Moment "${currentMoment}". Ge feedback och skriv [QUIZ_POÄNG:X.XX] på en EGEN rad allra sist (0.0=helt fel, 1.0=perfekt). ${nextMoment ? `Ställ sedan direkt nästa fråga om Moment "${nextMoment}".` : 'Alla Moment är nu besvarade – avsluta provet och sammanfatta elevens totalpoäng.'}]` },
            { role: 'assistant', content: 'Förstått.' },
            ...trimmedMsgs,
          ]
        : trimmedMsgs;

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Stream with marker buffer (marker max ~20 chars: [QUIZ_POÄNG:0.00])
      const QUIZ_MARKER_RE = /\[QUIZ_POÄNG:([\d.]+)\]/;
      const QUIZ_BUF_LEN = 20;
      let quizAssistantMsg = '';
      let quizStreamBuf = '';

      const quizStream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: [{ type: 'text', text: quizSystemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: sonnetMsgs,
      });

      for await (const chunk of quizStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          quizAssistantMsg += chunk.delta.text;
          quizStreamBuf += chunk.delta.text;
          if (quizStreamBuf.length > QUIZ_BUF_LEN) {
            res.write(`data: ${JSON.stringify({ text: quizStreamBuf.slice(0, -QUIZ_BUF_LEN) })}\n\n`);
            quizStreamBuf = quizStreamBuf.slice(-QUIZ_BUF_LEN);
          }
        }
      }
      const quizRemainder = quizStreamBuf.replace(QUIZ_MARKER_RE, '').trimEnd();
      if (quizRemainder) res.write(`data: ${JSON.stringify({ text: quizRemainder })}\n\n`);

      // Parse score and clean message
      const scoreMatch = quizAssistantMsg.match(QUIZ_MARKER_RE);
      const questionScore = scoreMatch ? Math.min(1, Math.max(0, parseFloat(scoreMatch[1]))) : null;
      const cleanedQuizMsg = quizAssistantMsg.replace(QUIZ_MARKER_RE, '').trimEnd();

      if (intro) msgs.pop();
      msgs.push({ role: 'assistant', content: cleanedQuizMsg });

      // Save quiz_messages
      if (existingSession) {
        await db('chat_sessions')
          .where({ student_id: req.user.id, course_id: courseId })
          .update({ quiz_messages: JSON.stringify(msgs), updated_at: db.fn.now() });
      } else {
        await db('chat_sessions').insert({
          student_id: req.user.id,
          course_id: courseId,
          messages: JSON.stringify([]),
          quiz_messages: JSON.stringify(msgs),
        });
      }
      lap('db: save quiz_session');

      res.write(`data: ${JSON.stringify({ done: true, quizMessages: msgs })}\n\n`);

      const studentId = req.user.id;
      const io = req.app.get('io');

      (async () => {
        try {
          let newAnswered = answeredSections;
          if (!isTeacher && questionScore !== null && currentMoment && !answeredMoments.includes(currentMoment)) {
            newAnswered = [...answeredSections, { moment: currentMoment, score: questionScore }];
          }

          const totalScore = toc.length > 0
            ? Math.round(newAnswered.reduce((s, a) => s + a.score, 0) / toc.length * 100)
            : 0;

          const nextUnanswered = toc.find((m) => !newAnswered.map((a) => a.moment).includes(m)) || null;

          if (!isTeacher) {
            const existingSummary = await db('ai_summaries')
              .where({ student_id: studentId, course_id: courseId })
              .first();

            const summaryPatch = {
              quiz_score: totalScore,
              quiz_answered_sections: JSON.stringify(newAnswered),
            };

            if (existingSummary) {
              await db('ai_summaries')
                .where({ student_id: studentId, course_id: courseId })
                .update({ ...summaryPatch, updated_at: db.fn.now() });
            } else {
              await db('ai_summaries').insert({
                student_id: studentId,
                course_id: courseId,
                summary: '',
                goal_achievement: 0,
                reasons: '',
                current_section: toc[0] || '',
                completed_sections: JSON.stringify([]),
                ...summaryPatch,
              });
            }

            io.to(`student:${studentId}`).emit('quiz_progress', {
              quizScore: totalScore,
              quizAnsweredSections: newAnswered,
              currentQuestion: nextUnanswered,
              totalQuestions: toc.length,
              toc,
            });
          }
        } catch (quizErr) {
          console.error('Quiz progress error:', quizErr);
        } finally {
          res.end();
        }
      })();

      return;
    }
    // ── END QUIZ MODE ────────────────────────────────────────────────────────

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

    // Fetch current Moment from last analysis (both students and teachers in test mode)
    const lastSummary = await db('ai_summaries')
      .where({ student_id: req.user.id, course_id: courseId })
      .select('current_section', 'completed_sections')
      .first();
    lap('db: last_summary');

    const currentMoment = lastSummary?.current_section || toc[0] || null;

    const previousCompleted = Array.isArray(lastSummary?.completed_sections)
      ? lastSummary.completed_sections
      : (lastSummary?.completed_sections ? JSON.parse(lastSummary.completed_sections) : []);

    const currentMomentIndex = toc.indexOf(currentMoment);
    const nextMoment = currentMomentIndex >= 0 && currentMomentIndex < toc.length - 1
      ? toc[currentMomentIndex + 1]
      : null;

    // Prepend Moment context to messages sent to Sonnet (never saved to DB)
    const sonnetMessages = currentMoment
      ? [
          { role: 'user', content: `[Momentkontext: Eleven arbetar nu med Moment "${currentMoment}". Fokusera på att undervisa detta Moment. När du har gått igenom det viktigaste innehållet, skriv exakt [MOMENT_KLAR] på en EGEN rad allra sist i ditt svar. Fråga INTE eleven om de vill fortsätta – gå bara vidare direkt.${nextMoment ? ` Nästa Moment är "${nextMoment}".` : ''}]` },
          { role: 'assistant', content: 'Förstått, jag fokuserar på detta Moment.' },
          ...trimmedMessages,
        ]
      : trimmedMessages;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Stream Claude response
    const claudeStart = Date.now();
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: sonnetMessages,
    });

    // Buffer the last MARKER.length chars to avoid streaming [MOMENT_KLAR] to the client
    const MARKER = '[MOMENT_KLAR]';
    let assistantMessage = '';
    let streamBuffer = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        assistantMessage += chunk.delta.text;
        streamBuffer += chunk.delta.text;
        if (streamBuffer.length > MARKER.length) {
          const toSend = streamBuffer.slice(0, -MARKER.length);
          res.write(`data: ${JSON.stringify({ text: toSend })}\n\n`);
          streamBuffer = streamBuffer.slice(-MARKER.length);
        }
      }
    }
    // Flush remainder, stripping marker if present
    const bufferedRemainder = streamBuffer.replace(MARKER, '').trimEnd();
    if (bufferedRemainder) {
      res.write(`data: ${JSON.stringify({ text: bufferedRemainder })}\n\n`);
    }

    const final = await stream.finalMessage();
    const u = final.usage;
    process.stderr.write(`[chat] claude: ${Date.now() - claudeStart}ms (in: ${u?.input_tokens}, out: ${u?.output_tokens}, cache_read: ${u?.cache_read_input_tokens ?? 0}, cache_write: ${u?.cache_creation_input_tokens ?? 0})\n`);

    // Strip [MOMENT_KLAR] marker – never saved to DB or shown to student
    const momentComplete = assistantMessage.includes(MARKER);
    const cleanedMessage = assistantMessage.replace(MARKER, '').trimEnd();

    // For intro: pop the hidden prompt and only keep the assistant greeting
    if (intro) messages.pop();
    messages.push({ role: 'assistant', content: cleanedMessage });

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

    // Run TOC advancement + quick replies async, emit results via socket.io when done
    const studentId = req.user.id;
    const io = req.app.get('io');

    (async () => {
      try {
        // TOC advancement: Sonnet signals completion via [MOMENT_KLAR] marker
        const currentIndex = toc.indexOf(currentMoment);
        let newCurrentSection = currentMoment;
        if (momentComplete && currentIndex >= 0 && currentIndex < toc.length - 1) {
          newCurrentSection = toc[currentIndex + 1];
        }

        const completedSections = (momentComplete && currentMoment && !previousCompleted.includes(currentMoment))
          ? [...previousCompleted, currentMoment]
          : previousCompleted;

        const goalAchievement = toc.length > 0
          ? Math.round((completedSections.length / toc.length) * 100)
          : 0;

        const summaryData = {
          summary: '',
          goal_achievement: goalAchievement,
          reasons: '',
          current_section: newCurrentSection || '',
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
          summary: '',
          reasons: '',
          currentSection: newCurrentSection || '',
          completedSections,
          toc,
        });

        // Quick replies (Haiku) – independent of Moment analysis
        const quickRepliesPromise = (enableQuickReplies && !intro)
          ? anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 256,
              messages: [
                {
                  role: 'user',
                  content: `AI-läraren ställde en fråga till eleven nedan. Ge exakt 3 svarsalternativ på svenska:\n1. Ett helt korrekt svar\n2. Ett nästan korrekt svar (delvis rätt men innehåller ett vanligt missförstånd)\n3. Ett felaktigt svar\n\nAlternativen ska vara korta (max 10 ord), blandade i slumpmässig ordning så eleven inte vet vilket som är rätt. Returnera ENDAST en JSON-array med 3 strings, inga förklaringar.\n\nAI:ns fråga: ${cleanedMessage}`,
                },
              ],
            }).then(r => {
              const text = r.content[0].text.trim();
              const match = text.match(/\[[\s\S]*\]/);
              return match ? JSON.parse(match[0]) : [];
            }).catch(() => [])
          : Promise.resolve(null); // null = feature off, don't emit

        const quickReplies = await quickRepliesPromise;
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
