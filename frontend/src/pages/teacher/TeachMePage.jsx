import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

function splitIntoParagraphs(text) {
  return text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
}

function base64ToUint8Array(b64) {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function mergeAlignments(alignments) {
  const characters = [], startTimes = [], endTimes = [];
  for (const a of alignments) {
    if (!a) continue;
    characters.push(...a.characters);
    startTimes.push(...a.character_start_times_seconds);
    endTimes.push(...a.character_end_times_seconds);
  }
  return { characters, startTimes, endTimes };
}

function buildWords(characters, startTimes, endTimes) {
  const words = [];
  let current = null;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      if (current) { words.push(current); current = null; }
      words.push({ text: ch, start: startTimes[i], end: endTimes[i], isSpace: true });
    } else {
      if (!current) current = { text: '', start: startTimes[i], end: 0, isSpace: false };
      current.text += ch;
      current.end = endTimes[i];
    }
  }
  if (current) words.push(current);
  return words;
}

// Determine heading level from markdown prefix
function getHeadingLevel(para) {
  const m = para.match(/^(#{1,6})\s/);
  return m ? m[1].length : 0;
}

function stripMarkdown(para) {
  return para
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

const headingClass = {
  1: 'text-2xl font-bold text-gray-900 mt-6 mb-2',
  2: 'text-xl font-bold text-gray-900 mt-5 mb-2',
  3: 'text-lg font-semibold text-gray-800 mt-4 mb-1',
  4: 'text-base font-semibold text-gray-800 mt-3 mb-1',
};

function ActiveParagraph({ para, words, activeWordIndex }) {
  const level = getHeadingLevel(para);
  const Tag = level >= 1 && level <= 4 ? `h${level}` : 'p';
  const cls = headingClass[level] || 'text-sm text-gray-900 leading-relaxed';

  return (
    <Tag className={cls}>
      {words.map((word, wi) =>
        word.isSpace ? (
          <span key={wi}>{word.text}</span>
        ) : (
          <span
            key={wi}
            className={activeWordIndex === wi ? 'bg-yellow-300 rounded px-0.5' : ''}
          >
            {word.text}
          </span>
        )
      )}
    </Tag>
  );
}

export default function TeachMePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState('');
  const [paragraphs, setParagraphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentParagraph, setCurrentParagraph] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [paragraphWords, setParagraphWords] = useState([]);
  const [done, setDone] = useState(false);

  const chunksRef = useRef([]);
  const alignmentsRef = useRef([]);
  const audioRef = useRef(null);
  const stoppedRef = useRef(false);
  const pausedRef = useRef(false);
  const paragraphsRef = useRef([]);
  const wordsRef = useRef([]);
  const rafRef = useRef(null);
  const paragraphRefs = useRef([]);

  useEffect(() => {
    api.get(`/courses/${id}`).then(({ data }) => {
      const mat = data.compiled_material || '';
      setMaterial(mat);
      const paras = splitIntoParagraphs(mat);
      setParagraphs(paras);
      paragraphsRef.current = paras;
    }).catch(() => {
      setError('Kunde inte hämta kursmaterial');
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (currentParagraph >= 0 && paragraphRefs.current[currentParagraph]) {
      paragraphRefs.current[currentParagraph].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentParagraph]);

  const stopRAF = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startRAF = useCallback(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = audio.currentTime;
      const words = wordsRef.current;
      let found = -1;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (!w.isSpace && t >= w.start && t <= w.end + 0.05) { found = i; break; }
      }
      setActiveWordIndex(found);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const playAudio = useCallback((audioChunks) => {
    return new Promise((resolve) => {
      if (stoppedRef.current || audioChunks.length === 0) { resolve(); return; }
      const arrays = audioChunks.map(base64ToUint8Array);
      const blob = new Blob(arrays, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      const cleanup = () => {
        stopRAF();
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setActiveWordIndex(-1);
        resolve();
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      startRAF();
      audio.play().catch(cleanup);
    });
  }, [startRAF, stopRAF]);

  const stopPlayback = useCallback(() => {
    stoppedRef.current = true;
    stopRAF();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    getSocket().emit('tts_stop');
    setPlaying(false);
    setPaused(false);
    pausedRef.current = false;
    setCurrentParagraph(-1);
    setActiveWordIndex(-1);
    setParagraphWords([]);
  }, [stopRAF]);

  const startPlayback = useCallback(() => {
    if (playing || !material) return;
    const socket = getSocket();
    stoppedRef.current = false;
    pausedRef.current = false;
    chunksRef.current = [];
    alignmentsRef.current = [];
    setPlaying(true);
    setPaused(false);
    setDone(false);

    const requestParagraph = (index) => {
      if (stoppedRef.current) return;
      const paras = paragraphsRef.current;
      if (index >= paras.length) {
        setPlaying(false);
        setPaused(false);
        setCurrentParagraph(-1);
        setActiveWordIndex(-1);
        setParagraphWords([]);
        setDone(true);
        cleanup();
        return;
      }
      chunksRef.current = [];
      alignmentsRef.current = [];
      setCurrentParagraph(index);
      setActiveWordIndex(-1);
      setParagraphWords([]);
      socket.emit('tts_request_paragraph', {
        paragraphIndex: index,
        text: stripMarkdown(paras[index]),
      });
    };

    const onChunk = ({ audioB64, alignment }) => {
      chunksRef.current.push(audioB64);
      alignmentsRef.current.push(alignment);
    };

    const onParagraphDone = async ({ paragraphIndex }) => {
      const { characters, startTimes, endTimes } = mergeAlignments(alignmentsRef.current);
      if (characters.length > 0) {
        const words = buildWords(characters, startTimes, endTimes);
        wordsRef.current = words;
        setParagraphWords(words);
      } else {
        wordsRef.current = [];
      }

      await new Promise((resolve) => {
        const check = () => {
          if (!pausedRef.current || stoppedRef.current) { resolve(); return; }
          setTimeout(check, 100);
        };
        check();
      });

      if (!stoppedRef.current) await playAudio([...chunksRef.current]);
      requestParagraph(paragraphIndex + 1);
    };

    const onError = ({ message }) => {
      cleanup();
      stopRAF();
      setPlaying(false);
      setPaused(false);
      setError(`TTS-fel: ${message}`);
    };

    const cleanup = () => {
      socket.off('tts_chunk', onChunk);
      socket.off('tts_paragraph_done', onParagraphDone);
      socket.off('tts_error', onError);
    };

    socket.on('tts_chunk', onChunk);
    socket.on('tts_paragraph_done', onParagraphDone);
    socket.on('tts_error', onError);

    requestParagraph(0);
  }, [playing, material, playAudio, stopRAF]);

  const pausePlayback = () => {
    if (!playing) return;
    if (!paused) {
      pausedRef.current = true;
      stopRAF();
      audioRef.current?.pause();
      setPaused(true);
    } else {
      pausedRef.current = false;
      if (audioRef.current) { startRAF(); audioRef.current.play(); }
      setPaused(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Laddar...</div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => { stopPlayback(); navigate(`/teacher/courses/${id}`); }}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >←</button>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Undervisa mig</h2>
          <p className="text-xs text-gray-400">Uppläsning av kursmaterial</p>
        </div>
        <div className="flex items-center gap-2">
          {!playing && !done && (
            <button onClick={startPlayback} disabled={!material}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              ▶ Starta uppläsning
            </button>
          )}
          {playing && (
            <>
              <button onClick={pausePlayback}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors">
                {paused ? '▶ Fortsätt' : '⏸ Pausa'}
              </button>
              <button onClick={stopPlayback}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                ⏹ Stopp
              </button>
            </>
          )}
          {done && (
            <button onClick={() => setDone(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Läs upp igen
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">{error}</div>
          )}
          {!material && (
            <p className="text-sm text-gray-400 italic text-center mt-8">
              Inget kompilerat material finns. Förbered kursmaterial i steg 2 först.
            </p>
          )}
          {done && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-6 text-sm text-center">
              Uppläsningen är klar!
            </div>
          )}

          {/* One flowing document */}
          <div className="prose prose-sm max-w-none">
            {paragraphs.map((para, i) => {
              const isActive = currentParagraph === i;
              return (
                <div
                  key={i}
                  ref={el => paragraphRefs.current[i] = el}
                  className={isActive ? 'bg-blue-50 rounded-lg px-3 -mx-3' : ''}
                >
                  {isActive && paragraphWords.length > 0 ? (
                    <ActiveParagraph
                      para={para}
                      words={paragraphWords}
                      activeWordIndex={activeWordIndex}
                    />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{para}</ReactMarkdown>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
