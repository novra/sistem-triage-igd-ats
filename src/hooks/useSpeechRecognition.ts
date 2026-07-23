import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultHandler = (finalText: string, interimText: string) => void;

function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function comparable(value: string) {
  return value.toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Gabungkan transkrip kumulatif Chrome mobile tanpa mengulang kata overlap. */
function mergeSpeechText(base: string, addition: string) {
  const left = words(base);
  const right = words(addition);
  if (!right.length) return left.join(" ");
  if (!left.length) return right.join(" ");

  const maxOverlap = Math.min(left.length, right.length);
  let overlap = 0;
  for (let size = maxOverlap; size > 0; size -= 1) {
    const leftTail = left.slice(-size).map(comparable).join(" ");
    const rightHead = right.slice(0, size).map(comparable).join(" ");
    if (leftTail === rightHead) {
      overlap = size;
      break;
    }
  }
  return [...left, ...right.slice(overlap)].join(" ");
}

function mergeSegments(segments: string[]) {
  return segments.reduce((result, segment) => mergeSpeechText(result, segment), "");
}

function speechErrorMessage(code?: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Izin mikrofon ditolak. Aktifkan izin mikrofon pada pengaturan browser.";
    case "audio-capture":
      return "Mikrofon tidak tersedia atau sedang digunakan aplikasi lain.";
    case "network":
      return "Layanan pengenalan suara terkendala jaringan. Periksa koneksi internet.";
    default:
      return code === "aborted" || code === "no-speech"
        ? null
        : "Perekaman suara berhenti sebelum transkrip selesai.";
  }
}

/**
 * Wrapper Web Speech API yang memperlakukan beberapa restart otomatis browser
 * mobile sebagai satu sesi rekaman. Interim hanya preview dan tidak pernah
 * dijadikan basis sesi berikutnya sebelum berubah menjadi hasil final.
 */
export function useSpeechRecognition(onResult: SpeechResultHandler, lang = "id-ID") {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const desiredListeningRef = useRef(false);
  const activeRef = useRef(false);
  const cycleRef = useRef(0);
  const committedTextRef = useRef("");
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const launchRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const launch = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !desiredListeningRef.current || activeRef.current) return;

    const cycleId = ++cycleRef.current;
    const recognition = new Ctor();
    let cycleFinalText = "";
    activeRef.current = true;
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      if (cycleId !== cycleRef.current) return;
      const finalSegments: string[] = [];
      const interimSegments: string[] = [];

      // Bangun ulang semua result karena resultIndex tidak selalu konsisten di
      // Chrome Android. mergeSegments menangani segmen kumulatif yang overlap.
      for (let index = 0; index < event.results.length; index += 1) {
        const transcript = String(event.results[index][0]?.transcript || "").trim();
        if (!transcript) continue;
        (event.results[index].isFinal ? finalSegments : interimSegments).push(transcript);
      }

      cycleFinalText = mergeSegments(finalSegments);
      const completeFinal = mergeSpeechText(committedTextRef.current, cycleFinalText);
      const rawInterim = mergeSegments(interimSegments);
      // Buang kata awal interim yang mengulang ekor hasil final.
      const previewCombined = mergeSpeechText(completeFinal, rawInterim);
      const interimOnly = words(previewCombined).slice(words(completeFinal).length).join(" ");
      onResultRef.current(completeFinal ? `${completeFinal} ` : "", interimOnly);
    };

    recognition.onerror = (event: any) => {
      if (cycleId !== cycleRef.current) return;
      const message = speechErrorMessage(event?.error);
      if (message) {
        setError(message);
        desiredListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      if (cycleId !== cycleRef.current) return;
      committedTextRef.current = mergeSpeechText(committedTextRef.current, cycleFinalText);
      onResultRef.current(committedTextRef.current ? `${committedTextRef.current} ` : "", "");
      activeRef.current = false;
      recognitionRef.current = null;

      if (desiredListeningRef.current) {
        // Chrome mobile sering menutup sesi continuous setelah jeda. Lanjutkan
        // sebagai siklus baru tanpa membawa interim yang belum final.
        restartTimerRef.current = setTimeout(() => launchRef.current(), 180);
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch {
      activeRef.current = false;
      recognitionRef.current = null;
      desiredListeningRef.current = false;
      setIsListening(false);
      setError("Perekaman belum dapat dimulai. Tunggu sebentar lalu coba kembali.");
    }
  }, [lang]);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const start = useCallback(() => {
    if (!getSpeechRecognitionCtor() || desiredListeningRef.current) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    committedTextRef.current = "";
    desiredListeningRef.current = true;
    setError(null);
    setIsListening(true);
    launchRef.current();
  }, []);

  const stop = useCallback(() => {
    desiredListeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    if (activeRef.current) recognitionRef.current?.stop();
    else setIsListening(false);
  }, []);

  useEffect(() => () => {
    desiredListeningRef.current = false;
    cycleRef.current += 1;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  return { isSupported, isListening, error, start, stop };
}
