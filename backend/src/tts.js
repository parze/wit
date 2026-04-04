const logger = require('./logger');

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'kpTdKfohzvarfFPnwuHW';
const API_KEY = process.env.ELEVENLABS_API_KEY;

function registerTTSHandlers(io, socket) {
  let abortController = null;

  socket.on('tts_stop', () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  });

  socket.on('tts_request_paragraph', async ({ paragraphIndex, text }) => {
    if (!API_KEY) {
      socket.emit('tts_error', { message: 'ELEVENLABS_API_KEY är inte konfigurerad' });
      return;
    }
    if (!text) {
      socket.emit('tts_paragraph_done', { paragraphIndex });
      return;
    }

    abortController = new AbortController();

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.8 },
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const err = await response.text();
        logger.error({ status: response.status, err }, 'ElevenLabs error');
        socket.emit('tts_error', { message: `ElevenLabs ${response.status}: ${err}` });
        return;
      }

      const data = await response.json();

      socket.emit('tts_chunk', {
        paragraphIndex,
        audioB64: data.audio_base64,
        alignment: data.alignment || null,
      });

      socket.emit('tts_paragraph_done', { paragraphIndex });
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'ElevenLabs fetch error');
      socket.emit('tts_error', { message: err.message });
    } finally {
      abortController = null;
    }
  });
}

module.exports = { registerTTSHandlers };
