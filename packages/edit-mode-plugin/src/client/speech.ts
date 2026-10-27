interface SpeechResult {
  0: { transcript: string };
}

interface SpeechResultEvent extends Event {
  results: Iterable<SpeechResult>;
}

interface SpeechRecognizer extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
}

type SpeechRecognizerConstructor = new () => SpeechRecognizer;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognizerConstructor;
    webkitSpeechRecognition?: SpeechRecognizerConstructor;
  }
}

function recognizerConstructor(): SpeechRecognizerConstructor | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function speechSupported(): boolean {
  return recognizerConstructor() !== undefined;
}

function isResultEvent(event: Event): event is SpeechResultEvent {
  return "results" in event;
}

function transcriptOf(event: SpeechResultEvent): string {
  let text = "";
  for (const result of event.results) {
    text += result[0].transcript;
  }
  return text.trim();
}

export function startDictation(onText: (text: string) => void, onEnd: () => void): (() => void) | null {
  const Recognizer = recognizerConstructor();
  if (Recognizer === undefined) {
    return null;
  }
  const recognizer = new Recognizer();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = navigator.language;
  recognizer.addEventListener("result", (event) => {
    if (isResultEvent(event)) {
      onText(transcriptOf(event));
    }
  });
  recognizer.addEventListener("error", onEnd);
  recognizer.addEventListener("end", onEnd);
  recognizer.start();
  return () => {
    recognizer.stop();
  };
}
