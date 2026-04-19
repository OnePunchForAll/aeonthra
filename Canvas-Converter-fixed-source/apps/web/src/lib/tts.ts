class AeonthraTts {
  private synth: SpeechSynthesis | null = typeof window !== "undefined" ? window.speechSynthesis : null;
  private voice: SpeechSynthesisVoice | null = null;
  private rate = 0.95;

  constructor() {
    if (!this.synth) {
      return;
    }

    const syncVoices = () => {
      const voices = this.synth?.getVoices() ?? [];
      this.voice =
        voices.find((entry) => entry.lang.startsWith("en-US")) ??
        voices.find((entry) => entry.lang.startsWith("en")) ??
        voices[0] ??
        null;
    };

    syncVoices();
    this.synth.addEventListener("voiceschanged", syncVoices);
  }

  supported(): boolean {
    return Boolean(this.synth);
  }

  speaking(): boolean {
    return Boolean(this.synth?.speaking);
  }

  stop(): void {
    this.synth?.cancel();
  }

  speak(text: string): void {
    if (!this.synth || !text.trim()) {
      return;
    }

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
    utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.pitch = 1;
    utterance.volume = 0.85;
    this.synth.speak(utterance);
  }
}

export const aeonthraTts = new AeonthraTts();
