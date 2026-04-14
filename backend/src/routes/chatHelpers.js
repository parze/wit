'use strict';

const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'kpTdKfohzvarfFPnwuHW';

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

async function emitChatTTS(io, studentId, text, seq) {
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) { io.to(`student:${studentId}`).emit('chat_tts_skip', { seq }); return; }
  const plain = stripMarkdown(text);
  if (!plain || plain.length < 4) { io.to(`student:${studentId}`).emit('chat_tts_skip', { seq }); return; }
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plain,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: 1.2 },
        }),
      }
    );
    if (!response.ok) { io.to(`student:${studentId}`).emit('chat_tts_skip', { seq }); return; }
    const chunks = [];
    for await (const chunk of response.body) chunks.push(chunk);
    const audioB64 = Buffer.concat(chunks).toString('base64');
    io.to(`student:${studentId}`).emit('chat_tts_chunk', { audioB64, seq });
  } catch {
    io.to(`student:${studentId}`).emit('chat_tts_skip', { seq });
  }
}

function setSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.socket?.setNoDelay(true);
  // SSE comment to commit proxy to streaming mode before first AI token
  res.write(': ok\n\n');
}

/**
 * Stream an Anthropic stream to the SSE response, buffering to hide markers
 * and emitting TTS sentences via socket.io.
 *
 * @param {object} opts
 * @param {object} opts.stream        - Anthropic message stream
 * @param {object} opts.res           - Express response (SSE)
 * @param {object} opts.io            - Socket.io server
 * @param {string} opts.studentId
 * @param {number} opts.markerBufLen  - chars to hold back (0 = no buffering)
 * @param {RegExp[]} opts.stripRe     - patterns to strip from remainder before flushing
 * @param {number} opts.startSeq      - starting TTS sequence number
 * @param {boolean} [opts.enableTTS]  - if false, skip TTS entirely (default true)
 * @returns {{ fullText: string, ttsSeq: number }}
 */
async function streamWithMarkerAndTTS({ stream, res, io, studentId, markerBufLen, stripRe, startSeq, label, enableTTS = true }) {
  const sentRe = /^([\s\S]*?[.!?])(\s+)/;
  let fullText = '';
  let streamBuf = '';
  let ttsBuf = '';
  let ttsSeq = startSeq ?? 0;
  const t0 = Date.now();
  let chunkCount = 0;
  let writeCount = 0;

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      chunkCount++;
      const elapsed = Date.now() - t0;
      if (chunkCount <= 5 || chunkCount % 20 === 0) {
        process.stderr.write(`[stream:${label ?? '?'}] chunk #${chunkCount} +${elapsed}ms "${chunk.delta.text.slice(0, 15).replace(/\n/g, '\\n')}"\n`);
      }
      fullText += chunk.delta.text;
      ttsBuf += chunk.delta.text;
      if (markerBufLen > 0) {
        streamBuf += chunk.delta.text;
        if (streamBuf.length > markerBufLen) {
          const wrote = res.write(`data: ${JSON.stringify({ text: streamBuf.slice(0, -markerBufLen) })}\n\n`);
          writeCount++;
          if (writeCount <= 3) process.stderr.write(`[stream:${label ?? '?'}] res.write #${writeCount} at +${Date.now() - t0}ms drained=${wrote}\n`);
          streamBuf = streamBuf.slice(-markerBufLen);
        }
      } else {
        const wrote = res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        writeCount++;
        if (writeCount <= 3) process.stderr.write(`[stream:${label ?? '?'}] res.write #${writeCount} at +${Date.now() - t0}ms drained=${wrote}\n`);
      }
      if (enableTTS) {
        let sentMatch;
        while ((sentMatch = sentRe.exec(ttsBuf)) !== null) {
          const sentence = sentMatch[1];
          ttsBuf = ttsBuf.slice(sentMatch[0].length);
          emitChatTTS(io, studentId, sentence, ttsSeq++).catch(() => {});
        }
      }
    }
  }

  const applyStrip = (s) => {
    if (!stripRe) return s;
    for (const re of stripRe) s = s.replace(re, '');
    return s;
  };

  if (markerBufLen > 0) {
    const remainder = applyStrip(streamBuf).trimEnd();
    if (remainder) res.write(`data: ${JSON.stringify({ text: remainder })}\n\n`);
  }

  process.stderr.write(`[stream:${label ?? '?'}] done: ${chunkCount} chunks, ${writeCount} writes, ${Date.now() - t0}ms total\n`);
  const ttsRemainder = applyStrip(ttsBuf).trim();
  if (enableTTS && ttsRemainder) emitChatTTS(io, studentId, ttsRemainder, ttsSeq++).catch(() => {});

  return { fullText, ttsSeq };
}

/**
 * Insert or update a row in ai_summaries.
 * On insert, `defaults` fills fields not present in `patch`.
 */
async function upsertAiSummary(db, studentId, courseId, patch, defaults = {}) {
  const existing = await db('ai_summaries')
    .where({ student_id: studentId, course_id: courseId })
    .first();

  if (existing) {
    await db('ai_summaries')
      .where({ student_id: studentId, course_id: courseId })
      .update({ ...patch, updated_at: db.fn.now() });
  } else {
    await db('ai_summaries').insert({
      student_id: studentId,
      course_id: courseId,
      ...defaults,
      ...patch,
    });
  }
}

/**
 * Insert or update a row in chat_sessions for the given messages field.
 * @param {object} existingSession  - existing row or null/undefined
 * @param {object} extraInsertFields - additional fields to set only on insert
 */
async function upsertChatSession(db, userId, courseId, messagesField, messages, existingSession, extraInsertFields = {}) {
  if (existingSession) {
    await db('chat_sessions')
      .where({ student_id: userId, course_id: courseId })
      .update({ [messagesField]: JSON.stringify(messages), updated_at: db.fn.now() });
  } else {
    await db('chat_sessions').insert({
      student_id: userId,
      course_id: courseId,
      [messagesField]: JSON.stringify(messages),
      ...extraInsertFields,
    });
  }
}

/**
 * Extract the content of a specific ## Moment from compiled course material.
 */
function getMomentContent(courseMaterial, momentName, toc) {
  if (!momentName || !courseMaterial) return '';
  const escapedName = momentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const momentIdx = toc.indexOf(momentName);
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
}

/**
 * Ask Haiku to generate quick-reply options for the student.
 * @param {number} count - number of alternatives (default 2: 1 correct + 1 wrong)
 * Returns an empty array on any error (non-critical feature).
 */
async function generateQuickReplies(anthropic, momentContent, lastMessage, count = 2) {
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `AI-läraren undervisar om följande Moment:\n\n${momentContent || lastMessage}\n\nAI:ns senaste fråga till eleven:\n${lastMessage}\n\nGe exakt ${count} svarsalternativ på svenska:\n1. Ett korrekt svar baserat på Moment-innehållet\n2–${count}. ${count - 1} felaktiga svar\n\nAlternativen ska vara korta (max 10 ord), blandade i slumpmässig ordning så eleven inte vet vilket som är rätt. Returnera ENDAST en JSON-array med ${count} strings, inga förklaringar.`,
      }],
    });
    const text = r.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

module.exports = {
  stripMarkdown,
  emitChatTTS,
  setSSEHeaders,
  streamWithMarkerAndTTS,
  upsertAiSummary,
  upsertChatSession,
  getMomentContent,
  generateQuickReplies,
};
