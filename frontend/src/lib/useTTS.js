import { useState, useRef, useCallback } from 'react';

export default function useTTS() {
  const [ttsOffered, setTtsOffered] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);

  const audioCtxRef = useRef(null);
  const audioQueueRef = useRef({});
  const nextTTSSeqRef = useRef(0);
  const playingRef = useRef(false);

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  // Must be called from a user-gesture handler (click/tap) to unlock iOS audio
  const unlockAudio = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }, []);

  function tryPlayNext() {
    if (playingRef.current) return;
    const seq = nextTTSSeqRef.current;
    if (!(seq in audioQueueRef.current)) return;
    const b64 = audioQueueRef.current[seq];
    delete audioQueueRef.current[seq];
    nextTTSSeqRef.current = seq + 1;
    if (!b64) { tryPlayNext(); return; } // null = skip

    playingRef.current = true;
    const ctx = getAudioCtx();
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    ctx.decodeAudioData(bytes.buffer.slice(0)).then(buffer => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => { playingRef.current = false; tryPlayNext(); };
      source.start();
    }).catch(() => {
      playingRef.current = false;
      tryPlayNext();
    });
  }

  const onTTSChunk = useCallback(({ audioB64, seq }) => {
    if (!ttsEnabledRef.current) return;
    audioQueueRef.current[seq] = audioB64;
    tryPlayNext();
  }, []);

  const onTTSSkip = useCallback(({ seq }) => {
    audioQueueRef.current[seq] = null;
    tryPlayNext();
  }, []);

  const onTTSDone = useCallback(() => {
    // no-op for now
  }, []);

  const resetTTS = useCallback(() => {
    audioQueueRef.current = {};
    nextTTSSeqRef.current = 0;
    playingRef.current = false;
    // Stop any currently playing audio by disconnecting context destination briefly
    // (AudioBufferSourceNode can't be paused, but resetting the flag is enough
    //  since onended will call tryPlayNext which finds an empty queue)
  }, []);

  const toggleTTS = useCallback((next) => {
    setTtsEnabled(next);
    ttsEnabledRef.current = next;
    if (!next) {
      // Clear queue so nothing new plays
      audioQueueRef.current = {};
      nextTTSSeqRef.current = 0;
      playingRef.current = false;
    }
  }, []);

  return {
    ttsEnabled,
    ttsOffered,
    setTtsOffered,
    unlockAudio,
    resetTTS,
    toggleTTS,
    onTTSChunk,
    onTTSSkip,
    onTTSDone,
  };
}
