import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultHandler = (finalText: string, interimText: string) => void;

function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Wrapper tipis di atas Web Speech API bawaan browser (Chrome/Edge). Dipilih
 * untuk prototipe karena tidak butuh dependency baru, API key, atau
 * perubahan backend — transkrip langsung dituang ke textarea narasi yang
 * sudah ada, memakai ulang seluruh pipeline /parse-narrative tanpa diubah.
 */
export function useSpeechRecognition(onResult: SpeechResultHandler, lang = "id-ID") {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    finalTextRef.current = "";

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript as string;
        if (event.results[i].isFinal) finalTextRef.current += `${transcript} `;
        else interim += transcript;
      }
      onResult(finalTextRef.current, interim);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [lang, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { isSupported, isListening, start, stop };
}
