import { useState, useCallback, useRef } from 'react';

function stripMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/[#_*~`>]/g, '') // Remove basic markdown characters
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
}

export function useVoice({ onSpeechResult, onError }) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synth = window.speechSynthesis;
    const recognitionRef = useRef(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (onError) onError('Speech Recognition is not supported in this browser.');
            return;
        }

        if (synth && synth.speaking) {
            synth.cancel();
            setIsSpeaking(false);
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (onSpeechResult) onSpeechResult(transcript);
        };
        recognition.onerror = (event) => {
            // no-speech etc, let's just surface error
            if (onError) onError(`Voice error: ${event.error}`);
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
    }, [onSpeechResult, onError, synth]);

    const speak = useCallback((text) => {
        if (!synth) return;
        synth.cancel();

        const cleanText = stripMarkdown(text);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 0.95; // teacher-like rate
        utterance.pitch = 1.05; // teacher-like pitch

        // Best effort try to pick a good English voice if loaded
        const voices = synth.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha')));
        if (enVoice) {
            utterance.voice = enVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synth.speak(utterance);
    }, [synth]);

    const stopSpeaking = useCallback(() => {
        if (synth && synth.speaking) {
            synth.cancel();
            setIsSpeaking(false);
        }
    }, [synth]);

    return { isListening, isSpeaking, startListening, speak, stopSpeaking };
}
