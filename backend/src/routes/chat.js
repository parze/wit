const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const logger = require('../logger');

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
    const lap = (label) => logger.debug(`[chat] ${label}: ${Date.now() - t0}ms`);

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

    logger.debug(`[chat] system prompt length: ${courseMaterial?.length ?? 0} chars`);

    const BASE_CHAT_PROMPT = `Du är en hjälpsam AI-lärare. Svara på elevens frågor baserat ENBART på kursmaterialet nedan. Om eleven frågar om något som inte finns i kursmaterialet, vägled dem tillbaka till ämnet på ett vänligt sätt.`;

    const DEFAULT_QUIZ_PROMPT = `Du är en provledare som testar elevens kunskaper om kursmaterialet. Svara ENBART baserat på kursmaterialet nedan.

Regler:
- Ställ 1–5 frågor per Moment baserat på innehållets komplexitet och djup – täck de viktigaste kunskaperna
- Variera frågetyper: faktafrågor, förståelsefrågor och tillämpningsfrågor
- Eleven har EN chans att svara per fråga – inga följdfrågor eller ledtrådar
- Efter varje svar om du ska ställa FLER frågor om SAMMA Moment: ge kortfattad feedback och skriv [QUIZ_POÄNG:X.XX] på en EGEN rad allra sist (0.0=helt fel, 0.5=delvis rätt, 1.0=perfekt)
- När du anser att ett Moment är tillräckligt täckt: ge kortfattad feedback och skriv [MOMENT_SLUT:X.XX] på en EGEN rad allra sist (genomsnittet av Momentets alla delsvar), gå sedan direkt till nästa Moment
- Skriv ALDRIG [QUIZ_POÄNG] eller [MOMENT_SLUT] i samma svar som du ställer en ny fråga
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

    // ── FÖRHÖR MODE ──────────────────────────────────────────────────────────
    if (req.body.mode === 'forhör') {
      const quizSystemPrompt = `${quizPrompt}\n\n--- KURSMATERIAL ---\n${courseMaterial}\n--------------------`;

      const existingSession = await db('chat_sessions')
        .where({ student_id: req.user.id, course_id: courseId })
        .first();
      lap('db: quiz_session');

      const quizMessages = (existingSession?.quiz_messages || []).filter(m => m.role !== 'meta');

      // Read answered sections from DB for everyone (teachers included, cleared on reset)
      const quizSummary = await db('ai_summaries')
        .where({ student_id: req.user.id, course_id: courseId })
        .select('quiz_answered_sections', 'quiz_score')
        .first();
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
        msgs.push({ role: 'user', content: `[Förhörsintro: Presentera att detta är ett förhör om "${course.title}". AI:n ställer tillräckligt många frågor per Moment för att täcka hela materialet. Skriv INTE [QUIZ_POÄNG] eller [MOMENT_SLUT] i detta svar. Ställ direkt den första frågan om Moment "${currentMoment}".]` });
      } else {
        msgs.push({ role: 'user', content: message.trim() });
      }

      const trimmedMsgs = msgs.length > 20 ? msgs.slice(-20) : msgs;

      const sonnetMsgs = (currentMoment && !intro)
        ? [
            { role: 'user', content: `[Förhörskontext: Eleven svarade nu på en fråga om Moment "${currentMoment}". Ge feedback och skriv antingen [QUIZ_POÄNG:X.XX] om du vill ställa fler frågor om samma Moment, eller [MOMENT_SLUT:X.XX] om Momentet är tillräckligt täckt (0.0=helt fel, 0.5=delvis, 1.0=perfekt). ${nextMoment ? `Vid [MOMENT_SLUT]: gå direkt till Moment "${nextMoment}".` : 'Vid [MOMENT_SLUT]: alla Moment klara – avsluta förhöret och sammanfatta totalpoängen.'}]` },
            { role: 'assistant', content: 'Förstått.' },
            ...trimmedMsgs,
          ]
        : trimmedMsgs;

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Buffer long enough for both markers ([MOMENT_SLUT:0.00] = 16 chars)
      const QUIZ_MARKER_RE = /\[QUIZ_POÄNG:([\d.]+)\]/;
      const MOMENT_SLUT_RE = /\[MOMENT_SLUT:([\d.]+)\]/;
      const MARKER_BUF_LEN = 20;
      let quizAssistantMsg = '';
      let quizStreamBuf = '';

      logger.info({ msgs: sonnetMsgs }, '[forhör:sent]');

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
          if (quizStreamBuf.length > MARKER_BUF_LEN) {
            res.write(`data: ${JSON.stringify({ text: quizStreamBuf.slice(0, -MARKER_BUF_LEN) })}\n\n`);
            quizStreamBuf = quizStreamBuf.slice(-MARKER_BUF_LEN);
          }
        }
      }
      const quizRemainder = quizStreamBuf.replace(QUIZ_MARKER_RE, '').replace(MOMENT_SLUT_RE, '').trimEnd();
      if (quizRemainder) res.write(`data: ${JSON.stringify({ text: quizRemainder })}\n\n`);

      logger.info({ msg: quizAssistantMsg }, '[forhör:received]');

      // Parse markers and clean message
      const momentSlutMatch = quizAssistantMsg.match(MOMENT_SLUT_RE);
      const momentSlutScore = momentSlutMatch ? Math.min(1, Math.max(0, parseFloat(momentSlutMatch[1]))) : null;
      const cleanedQuizMsg = quizAssistantMsg.replace(QUIZ_MARKER_RE, '').replace(MOMENT_SLUT_RE, '').trimEnd();

      if (intro) msgs.pop();
      msgs.push({ role: 'assistant', content: cleanedQuizMsg });

      // Advance to next moment only when AI signals [MOMENT_SLUT]
      let newAnsweredSections = [...answeredSections];
      if (momentSlutScore !== null && currentMoment && !answeredMoments.includes(currentMoment)) {
        newAnsweredSections = [...answeredSections, { moment: currentMoment, score: momentSlutScore }];
      }

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
          const totalScore = toc.length > 0
            ? Math.round(newAnsweredSections.reduce((s, a) => s + a.score, 0) / toc.length * 100)
            : 0;

          const nextUnanswered = toc.find((m) => !newAnsweredSections.map((a) => a.moment).includes(m)) || null;

          const existingSummary = await db('ai_summaries')
            .where({ student_id: studentId, course_id: courseId })
            .first();

          const summaryPatch = {
            quiz_score: totalScore,
            quiz_answered_sections: JSON.stringify(newAnsweredSections),
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
            quizAnsweredSections: newAnsweredSections,
            currentQuestion: nextUnanswered,
            totalQuestions: toc.length,
            toc,
          });
        } catch (quizErr) {
          logger.error({ err: quizErr }, 'Quiz progress error');
        } finally {
          res.end();
        }
      })();

      return;
    }
    // ── END FÖRHÖR MODE ──────────────────────────────────────────────────────

    const systemPrompt = `${chatPrompt}\n\n--- KURSMATERIAL ---\n${courseMaterial}\n--------------------`;
    logger.info({ systemPrompt: systemPrompt?.substring(0, 1000) }, '[chat] system prompt');

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

    logger.info({ msgs: sonnetMessages }, '[lär:sent]');

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

    logger.info({ msg: assistantMessage }, '[lär:received]');

    const final = await stream.finalMessage();
    const u = final.usage;
    logger.debug({ in: u?.input_tokens, out: u?.output_tokens, cache_read: u?.cache_read_input_tokens ?? 0, cache_write: u?.cache_creation_input_tokens ?? 0, ms: Date.now() - claudeStart }, '[chat] claude tokens');

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

    // Run TOC advancement async on the still-open SSE connection
    const studentId = req.user.id;
    const io = req.app.get('io');
    const isLastMoment = currentMomentIndex >= 0 && currentMomentIndex === toc.length - 1;

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

        if (momentComplete && !isLastMoment) {
          // Auto-advance: stream intro to next Moment on the same SSE connection
          res.write(`data: ${JSON.stringify({ newMessage: true })}\n\n`);

          const advancePrompt = `[Momentövergång: Moment "${currentMoment}" klart. Presentera nästa Moment "${newCurrentSection}" med 2–3 meningar intro + inbjudande fråga. Skriv INTE [MOMENT_KLAR].]`;
          const advanceMessages = [...messages, { role: 'user', content: advancePrompt }];
          const trimmedAdvance = advanceMessages.length > 20 ? advanceMessages.slice(-20) : advanceMessages;

          const advanceStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
            messages: trimmedAdvance,
          });

          let advanceMsg = '';
          for await (const chunk of advanceStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              advanceMsg += chunk.delta.text;
              res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
            }
          }

          messages.push({ role: 'assistant', content: advanceMsg });

          await db('chat_sessions')
            .where({ student_id: studentId, course_id: courseId })
            .update({ messages: JSON.stringify(messages), updated_at: db.fn.now() });

          res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);

          // Generate quick replies for the advance intro (same logic as normal turn)
          if (enableQuickReplies) {
            const escapedName = newCurrentSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const momentIdx = toc.indexOf(newCurrentSection);
            const nextName = toc[momentIdx + 1];
            let pattern;
            if (nextName) {
              const escapedNext = nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              pattern = new RegExp(`^## ${escapedName}$[\\s\\S]*?(?=^## ${escapedNext}$)`, 'm');
            } else {
              pattern = new RegExp(`^## ${escapedName}$[\\s\\S]*$`, 'm');
            }
            const momentMatch = courseMaterial?.match(pattern);
            const momentContent = momentMatch ? momentMatch[0] : '';

            try {
              const r = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 256,
                messages: [{
                  role: 'user',
                  content: `AI-läraren undervisar om följande Moment:\n\n${momentContent || advanceMsg}\n\nAI:ns senaste fråga till eleven:\n${advanceMsg}\n\nGe exakt 2 svarsalternativ på svenska:\n1. Ett korrekt svar baserat på Moment-innehållet\n2. Ett felaktigt svar\n\nAlternativen ska vara korta (max 10 ord), blandade i slumpmässig ordning så eleven inte vet vilket som är rätt. Returnera ENDAST en JSON-array med 2 strings, inga förklaringar.`,
                }],
              });
              const text = r.content[0].text.trim();
              const match = text.match(/\[[\s\S]*\]/);
              const quickReplies = match ? JSON.parse(match[0]) : [];
              io.to(`student:${studentId}`).emit('quick_replies', { quickReplies });
            } catch {
              // quick replies are non-critical
            }
          }

        } else if (momentComplete && isLastMoment) {
          // Last Moment completed – course done
          io.to(`student:${studentId}`).emit('course_complete', { courseId });
          res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);

        } else {
          // Normal turn: generate quick replies via Haiku
          const momentForReplies = newCurrentSection || currentMoment;
          const momentContent = (() => {
            if (!momentForReplies || !courseMaterial) return '';
            const escapedName = momentForReplies.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const momentIdx = toc.indexOf(momentForReplies);
            const nextName = toc[momentIdx + 1];
            let pattern;
            if (nextName) {
              const escapedNext = nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              pattern = new RegExp(`^## ${escapedName}$[\\s\\S]*?(?=^## ${escapedNext}$)`, 'm');
            } else {
              pattern = new RegExp(`^## ${escapedName}$[\\s\\S]*$`, 'm');
            }
            const m = courseMaterial.match(pattern);
            return m ? m[0] : '';
          })();

          const quickRepliesPromise = (enableQuickReplies)
            ? anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 256,
                messages: [
                  {
                    role: 'user',
                    content: `AI-läraren undervisar om följande Moment:\n\n${momentContent || cleanedMessage}\n\nAI:ns senaste fråga till eleven:\n${cleanedMessage}\n\nGe exakt 2 svarsalternativ på svenska:\n1. Ett korrekt svar baserat på Moment-innehållet\n2. Ett felaktigt svar\n\nAlternativen ska vara korta (max 10 ord), blandade i slumpmässig ordning så eleven inte vet vilket som är rätt. Returnera ENDAST en JSON-array med 2 strings, inga förklaringar.`,
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

          res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);
        }
      } catch (analysisErr) {
        logger.error({ err: analysisErr }, 'Analysis error');
        res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);
      } finally {
        res.end();
      }
    })();

    return;
  } catch (err) {
    logger.error({ err }, 'Chat error');
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    res.end();
  }
});

module.exports = router;
