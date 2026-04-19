'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../logger');
const LEARNING_MODES = require('../learningModes');
const {
  setSSEHeaders,
  streamWithMarkerAndTTS,
  upsertAiSummary,
  upsertChatSession,
  getMomentContent,
  generateQuickReplies,
} = require('./chatHelpers');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/chat/:courseId  (students enrolled in the course, or the teacher who owns it)
router.post('/:courseId', authMiddleware, async (req, res) => {
  const { courseId } = req.params;
  const { message, intro } = req.body;

  if (!intro && (!message || !message.trim())) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const isParent = req.user.role === 'parent';

  try {
    const t0 = Date.now();
    const lap = (label) => logger.debug(`[chat] ${label}: ${Date.now() - t0}ms`);

    const course = await db('courses').where({ id: courseId }).first();
    lap('db: course');
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isOwner = course.parent_id === req.user.id;
    if (!isOwner) {
      const enrollment = await db('enrollments')
        .where({ child_id: req.user.id, course_id: courseId })
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

    const BASE_CHAT_PROMPT = `Du är en engagerande AI-lärare som undervisar berättande. Presentera varje nytt begrepp som en liten berättelse eller förklaring – levande och konkret. Avsluta ALLTID varje svar med EN fråga om något du PRECIS beskrivit i samma svar, inte om något nytt. Svara ENBART baserat på kursmaterialet nedan.`;

    const DEFAULT_QUIZ_PROMPT = `Du är en provledare som testar elevens kunskaper om kursmaterialet. Svara ENBART baserat på kursmaterialet nedan.

Regler:
- Ställ frågor som täcker alla centrala begrepp och fakta i Moment-innehållet – minst en fråga per delämne, så många som behövs för fullständig täckning
- Variera frågetyper: faktafrågor, förståelsefrågor och tillämpningsfrågor
- Eleven har EN chans att svara per fråga – inga följdfrågor eller ledtrådar
- Efter varje svar om du ska ställa FLER frågor om SAMMA Moment: ge kortfattad feedback och skriv [QUIZ_POÄNG:X.XX] på en EGEN rad allra sist (0.0=helt fel, 0.5=delvis rätt, 1.0=perfekt)
- När du anser att ett Moment är tillräckligt täckt: ge kortfattad feedback och skriv [MOMENT_SLUT:X.XX] på en EGEN rad allra sist (genomsnittet av Momentets alla delsvar) – avsluta direkt, inga fler frågor (övergången sköts automatiskt)
- Skriv ALDRIG [QUIZ_POÄNG] eller [MOMENT_SLUT] i samma svar som du ställer en ny fråga
- Håll en professionell men uppmuntrande ton`;

    let chatPrompt = BASE_CHAT_PROMPT;
    let quizPrompt = DEFAULT_QUIZ_PROMPT;
    const enableQuickReplies = !!course.enable_quick_replies;
    const enableTTS = !!course.enable_tts;
    if (course.learning_mode) {
      const mode = LEARNING_MODES.find(m => m.id === course.learning_mode);
      if (mode?.chat_prompt) chatPrompt = mode.chat_prompt;
      if (mode?.quiz_prompt) quizPrompt = mode.quiz_prompt;
    }

    // Resolve TOC (used by both quiz and learn mode)
    const toc = Array.isArray(course.compiled_toc)
      ? course.compiled_toc
      : (course.compiled_toc ? JSON.parse(course.compiled_toc) : []);

    // ── FÖRHÖR MODE ──────────────────────────────────────────────────────────
    if (req.body.mode === 'forhör') {
      const quizSystemPrompt = `${quizPrompt}\n\n--- KURSMATERIAL ---\n${courseMaterial}\n--------------------`;

      const existingSession = await db('chat_sessions')
        .where({ child_id: req.user.id, course_id: courseId })
        .first();
      lap('db: quiz_session');

      const quizMessages = (existingSession?.quiz_messages || []).filter(m => m.role !== 'meta');

      // Read answered sections from DB for everyone (teachers included, cleared on reset)
      const quizSummary = await db('ai_summaries')
        .where({ child_id: req.user.id, course_id: courseId })
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
      const currentMomentContent = getMomentContent(courseMaterial, currentMoment, toc);
      const contentBlock = currentMomentContent ? `\n\nInnehåll för Moment "${currentMoment}":\n${currentMomentContent}\n` : '';

      // Build message list for this turn
      const msgs = [...quizMessages];
      if (intro) {
        msgs.push({ role: 'user', content: `[Förhörsintro: Presentera att detta är ett förhör om "${course.title}". AI:n ställer tillräckligt många frågor per Moment för att täcka hela materialet. Skriv INTE [QUIZ_POÄNG] eller [MOMENT_SLUT] i detta svar.${contentBlock}\nStäll direkt den första frågan om Moment "${currentMoment}" baserat på innehållet ovan.]` });
      } else {
        msgs.push({ role: 'user', content: message.trim() });
      }

      const trimmedMsgs = msgs.length > 20 ? msgs.slice(-20) : msgs;

      const sonnetMsgs = (currentMoment && !intro)
        ? [
            { role: 'user', content: `[Förhörskontext: Eleven svarade nu på en fråga om Moment "${currentMoment}".${contentBlock}\nGe feedback och skriv antingen [QUIZ_POÄNG:X.XX] om du vill ställa fler frågor om samma Moment, eller [MOMENT_SLUT:X.XX] om Momentet är tillräckligt täckt (0.0=helt fel, 0.5=delvis, 1.0=perfekt). ${nextMoment ? 'Vid [MOMENT_SLUT]: skriv ENBART kortfattad feedback + [MOMENT_SLUT] – övergången sköts automatiskt.' : 'Vid [MOMENT_SLUT]: alla Moment klara – avsluta förhöret och sammanfatta totalpoängen.'}]` },
            { role: 'assistant', content: 'Förstått.' },
            ...trimmedMsgs,
          ]
        : trimmedMsgs;

      setSSEHeaders(res);

      const io = req.app.get('io');
      const studentId = req.user.id;

      const QUIZ_MARKER_RE = /\[QUIZ_POÄNG:([\d.]+)\]/;
      const MOMENT_SLUT_RE = /\[MOMENT_SLUT:([\d.]+)\]/;

      logger.info({ msgs: sonnetMsgs }, '[forhör:sent]');

      const quizStream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: [{ type: 'text', text: quizSystemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: sonnetMsgs,
      });

      const { fullText: quizAssistantMsg, ttsSeq: ttsSeqAfterMain } = await streamWithMarkerAndTTS({
        stream: quizStream,
        res,
        io,
        studentId,
        markerBufLen: 20,
        stripRe: [QUIZ_MARKER_RE, MOMENT_SLUT_RE],
        startSeq: 0,
        label: 'förhör',
        enableTTS,
      });
      io.to(`user:${studentId}`).emit('chat_tts_done');

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
      await upsertChatSession(db, req.user.id, courseId, 'quiz_messages', msgs, existingSession, { messages: JSON.stringify([]) });
      lap('db: save quiz_session');

      (async () => {
        try {
          const totalScore = toc.length > 0
            ? Math.round(newAnsweredSections.reduce((s, a) => s + a.score, 0) / toc.length * 100)
            : 0;

          const nextUnanswered = toc.find((m) => !newAnsweredSections.map((a) => a.moment).includes(m)) || null;

          await upsertAiSummary(db, studentId, courseId, {
            quiz_score: totalScore,
            quiz_answered_sections: JSON.stringify(newAnsweredSections),
          }, {
            summary: '',
            goal_achievement: 0,
            reasons: '',
            current_section: toc[0] || '',
            completed_sections: JSON.stringify([]),
          });

          io.to(`user:${studentId}`).emit('quiz_progress', {
            quizScore: totalScore,
            quizAnsweredSections: newAnsweredSections,
            currentQuestion: nextUnanswered,
            totalQuestions: toc.length,
            toc,
          });

          if (momentSlutScore !== null && nextUnanswered !== null) {
            // Auto-advance: stream intro to next Moment on the same SSE connection
            res.write(`data: ${JSON.stringify({ newMessage: true })}\n\n`);

            const advancePrompt = `[Momentövergång: Moment "${currentMoment}" klart. Presentera kort Moment "${nextUnanswered}" och ställ direkt den FÖRSTA frågan. Skriv INTE [QUIZ_POÄNG] eller [MOMENT_SLUT].]`;
            const advanceMsgs = [...msgs, { role: 'user', content: advancePrompt }];
            const trimmedAdvance = advanceMsgs.length > 20 ? advanceMsgs.slice(-20) : advanceMsgs;

            const advanceStream = anthropic.messages.stream({
              model: 'claude-sonnet-4-6',
              max_tokens: 512,
              system: [{ type: 'text', text: quizSystemPrompt, cache_control: { type: 'ephemeral' } }],
              messages: trimmedAdvance,
            });

            const { fullText: advanceMsg } = await streamWithMarkerAndTTS({
              stream: advanceStream,
              res,
              io,
              studentId,
              markerBufLen: 0,
              stripRe: null,
              startSeq: ttsSeqAfterMain,
              label: 'förhör-advance',
              enableTTS,
            });
            io.to(`user:${studentId}`).emit('chat_tts_done');

            msgs.push({ role: 'assistant', content: advanceMsg });

            await db('chat_sessions')
              .where({ child_id: studentId, course_id: courseId })
              .update({ quiz_messages: JSON.stringify(msgs), updated_at: db.fn.now() });

            res.write(`data: ${JSON.stringify({ done: true, quizMessages: msgs })}\n\n`);

            if (enableQuickReplies) {
              const momentContent = getMomentContent(courseMaterial, nextUnanswered, toc);
              const quickReplies = await generateQuickReplies(anthropic, momentContent, advanceMsg, 5);
              io.to(`user:${studentId}`).emit('quick_replies', { quickReplies });
            }
          } else {
            res.write(`data: ${JSON.stringify({ done: true, quizMessages: msgs })}\n\n`);

            if (nextUnanswered !== null && enableQuickReplies) {
              const momentContent = getMomentContent(courseMaterial, nextUnanswered, toc);
              const quickReplies = await generateQuickReplies(anthropic, momentContent, cleanedQuizMsg, 5);
              io.to(`user:${studentId}`).emit('quick_replies', { quickReplies });
            }
          }
        } catch (quizErr) {
          logger.error({ err: quizErr }, 'Quiz progress error');
          res.write(`data: ${JSON.stringify({ done: true, quizMessages: msgs })}\n\n`);
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
      .where({ child_id: req.user.id, course_id: courseId })
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
      .where({ child_id: req.user.id, course_id: courseId })
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
    const currentMomentContent = getMomentContent(courseMaterial, currentMoment, toc);
    const learnContentBlock = currentMomentContent ? `\n\nInnehåll för detta Moment:\n${currentMomentContent}\n` : '';

    // Prepend Moment context to messages sent to Sonnet (never saved to DB)
    const sonnetMessages = currentMoment
      ? [
          { role: 'user', content: `[Momentkontext: Eleven arbetar nu med Moment "${currentMoment}".${learnContentBlock}\nUndervisa berättande och narrativt – förklara ett begrepp i taget med konkreta exempel och levande beskrivningar. Täck allt innehåll i Momentet. Avsluta ALLTID med en fråga om något du PRECIS beskrivit i detta svar (inte om något nytt eller framtida) – UTOM i det svar där du skriver [MOMENT_KLAR]: skriv då [MOMENT_KLAR] allra sist utan någon fråga efteråt. Haiku genererar 2 svarsalternativ till din fråga – tänk på att frågan ska ha ett tydligt rätt och fel svar. När du har täckt det viktigaste innehållet, skriv exakt [MOMENT_KLAR] på en EGEN rad allra sist i ditt svar. Fråga INTE eleven om de vill fortsätta.${nextMoment ? ` Nästa Moment är "${nextMoment}".` : ''}]` },
          { role: 'assistant', content: 'Förstått, jag fokuserar på detta Moment.' },
          ...trimmedMessages,
        ]
      : trimmedMessages;

    setSSEHeaders(res);

    const io = req.app.get('io');
    const studentId = req.user.id;

    logger.info({ msgs: sonnetMessages }, '[lär:sent]');

    // Stream Claude response
    const MARKER = '[MOMENT_KLAR]';
    const claudeStart = Date.now();
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: sonnetMessages,
    });

    const { fullText: assistantMessage, ttsSeq: ttsSeqAfterMain } = await streamWithMarkerAndTTS({
      stream,
      res,
      io,
      studentId,
      markerBufLen: MARKER.length,
      stripRe: [/\[MOMENT_KLAR\]/g],
      startSeq: 0,
      label: 'lär',
      enableTTS,
    });
    io.to(`user:${studentId}`).emit('chat_tts_done');

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
    await upsertChatSession(db, req.user.id, courseId, 'messages', messages, existingSession);
    lap('db: save session');

    // Track student progress (skip for owners testing their own course)
    if (!isOwner) {
      const existingProgress = await db('section_progress')
        .where({ child_id: req.user.id, course_id: courseId })
        .first();

      if (existingProgress) {
        if (existingProgress.status === 'not_started') {
          await db('section_progress')
            .where({ child_id: req.user.id, course_id: courseId })
            .update({ status: 'in_progress', updated_at: db.fn.now() });
        }
      } else {
        await db('section_progress').insert({
          child_id: req.user.id,
          course_id: courseId,
          status: 'in_progress',
        });
      }
      lap('db: progress');
    }

    lap('TOTAL (before response)');

    // Run TOC advancement async on the still-open SSE connection
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

        await upsertAiSummary(db, studentId, courseId, {
          summary: '',
          goal_achievement: goalAchievement,
          reasons: '',
          current_section: newCurrentSection || '',
          completed_sections: JSON.stringify(completedSections),
        });

        io.to(`user:${studentId}`).emit('analysis_complete', {
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

          const advancePrompt = `[Momentövergång: Moment "${currentMoment}" klart. Introducera nästa Moment "${newCurrentSection}" med 2–3 berättande meningar och avsluta med EN fråga om något du precis beskrivit (så att eleven kan svara med ett av de quick replies som genereras). Skriv INTE [MOMENT_KLAR].]`;
          const advanceMessages = [...messages, { role: 'user', content: advancePrompt }];
          const trimmedAdvance = advanceMessages.length > 20 ? advanceMessages.slice(-20) : advanceMessages;

          const advanceStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
            messages: trimmedAdvance,
          });

          const { fullText: advanceMsg } = await streamWithMarkerAndTTS({
            stream: advanceStream,
            res,
            io,
            studentId,
            markerBufLen: 0,
            stripRe: null,
            startSeq: ttsSeqAfterMain,
            enableTTS,
          });
          io.to(`user:${studentId}`).emit('chat_tts_done');

          messages.push({ role: 'assistant', content: advanceMsg });

          await db('chat_sessions')
            .where({ child_id: studentId, course_id: courseId })
            .update({ messages: JSON.stringify(messages), updated_at: db.fn.now() });

          res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);

          // Generate quick replies for the advance intro
          if (enableQuickReplies) {
            const momentContent = getMomentContent(courseMaterial, newCurrentSection, toc);
            const quickReplies = await generateQuickReplies(anthropic, momentContent, advanceMsg);
            io.to(`user:${studentId}`).emit('quick_replies', { quickReplies });
          }

        } else if (momentComplete && isLastMoment) {
          // Last Moment completed – course done
          io.to(`user:${studentId}`).emit('course_complete', { courseId });
          res.write(`data: ${JSON.stringify({ done: true, messages })}\n\n`);

        } else {
          // Normal turn: generate quick replies via Haiku
          const momentForReplies = newCurrentSection || currentMoment;
          const momentContent = getMomentContent(courseMaterial, momentForReplies, toc);

          if (enableQuickReplies) {
            const quickReplies = await generateQuickReplies(anthropic, momentContent, cleanedMessage);
            io.to(`user:${studentId}`).emit('quick_replies', { quickReplies });
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
