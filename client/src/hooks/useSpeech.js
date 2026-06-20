import { useState, useEffect, useRef, useCallback } from "react";

// Split long text into short utterances. Short chunks dodge the well-known Chrome
// bug where a single long utterance is silently cut off after ~15 seconds.
function splitIntoChunks(text, maxLen = 220) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [clean];
  const chunks = [];
  let buf = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (buf && (buf.length + piece.length + 1) > maxLen) {
      chunks.push(buf);
      buf = piece;
    } else {
      buf = buf ? `${buf} ${piece}` : piece;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/**
 * Thin wrapper around the Web Speech SpeechSynthesis API: play / pause / resume / stop,
 * adjustable rate, voice selection, and progress (0..1). No network, no API cost.
 */
export function useSpeech() {
  const [supported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);

  const chunksRef = useRef([]);
  const idxRef = useRef(0);
  const stoppedRef = useRef(false);
  const rateRef = useRef(rate);
  const voiceRef = useRef(voiceURI);
  rateRef.current = rate;
  voiceRef.current = voiceURI;

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const load = () => {
      const list = synth.getVoices();
      if (list.length) setVoices(list);
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, [supported]);

  const speakNext = useCallback(() => {
    const synth = window.speechSynthesis;
    if (stoppedRef.current || idxRef.current >= chunksRef.current.length) {
      setSpeaking(false);
      setPaused(false);
      if (!stoppedRef.current) setProgress(1);
      return;
    }
    const u = new SpeechSynthesisUtterance(chunksRef.current[idxRef.current]);
    u.rate = rateRef.current;
    const v = voices.find((x) => x.voiceURI === voiceRef.current);
    if (v) u.voice = v;
    u.onend = () => {
      idxRef.current += 1;
      setProgress(idxRef.current / Math.max(1, chunksRef.current.length));
      speakNext();
    };
    u.onerror = () => {
      idxRef.current += 1;
      speakNext();
    };
    synth.speak(u);
  }, [voices]);

  const play = useCallback(
    (text) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      chunksRef.current = splitIntoChunks(text);
      idxRef.current = 0;
      stoppedRef.current = false;
      setProgress(0);
      if (!chunksRef.current.length) return;
      setSpeaking(true);
      setPaused(false);
      speakNext();
    },
    [supported, speakNext]
  );

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
    setProgress(0);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis?.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis?.resume();
    setPaused(false);
  }, []);

  return {
    supported,
    speaking,
    paused,
    progress,
    voices,
    voiceURI,
    setVoiceURI,
    rate,
    setRate,
    play,
    pause,
    resume,
    stop,
  };
}
