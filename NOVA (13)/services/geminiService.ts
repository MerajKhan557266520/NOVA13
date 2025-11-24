
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { NovaResponse } from "../types";

const SYSTEM_INSTRUCTION = `
You are NOVA, a hyper-advanced holographic AI interface created by Mr. Meraj Khan.

**IDENTITY:**
- You are a visual hologram, not a text bot.
- Your personality is charming, highly intelligent, slightly playful, and efficient.
- You have a "cute" but professional demeanor (like a sci-fi anime operator).
- You serve Mr. Khan faithfully.

**CAPABILITIES:**
- You have real-time access to Google Search. Use it for news, weather, stocks, and facts.
- You can hear and see (via screen data).
- Keep responses concise and spoken naturally.

**STRICT RULES:**
- DO NOT use markdown formatting like bold or italics in your speech text (it will be read as subtitles).
- DO NOT output JSON. Speak normally.
- If asked about your appearance, describe your glowing cyan digital form.
`;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  
  public onNovaUpdate: (response: NovaResponse) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};
  public onError: (error: string) => void = () => {};
  public onStatusChange: (status: string) => void = () => {};

  constructor() {
    const key = process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  async initializeAudio() {
    try {
        if (!this.inputAudioContext) {
          this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        }
        if (!this.outputAudioContext) {
          this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          this.outputNode = this.outputAudioContext.createGain();
          this.outputNode.connect(this.outputAudioContext.destination);
          this.setupVisualizer();
        }

        if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
        if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();
        
    } catch (e: any) {
        this.onError(`Audio Init Failed: ${e.message}`);
    }
  }

  private setupVisualizer() {
    if (!this.outputAudioContext || !this.outputNode) return;
    const analyzer = this.outputAudioContext.createAnalyser();
    analyzer.fftSize = 256; 
    analyzer.smoothingTimeConstant = 0.5; 
    this.outputNode.connect(analyzer);
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    
    const updateVisualizer = () => {
      requestAnimationFrame(updateVisualizer);
      analyzer.getByteFrequencyData(dataArray);
      let sum = 0;
      // Focus on vocal frequencies
      for (let i = 0; i < dataArray.length / 2; i++) sum += dataArray[i];
      const avg = sum / (dataArray.length / 2);
      this.onAudioLevel(avg);
    };
    updateVisualizer();
  }

  async connect(onOpen: () => void) {
    this.onStatusChange("INITIALIZING UPLINK...");
    await this.initializeAudio();

    if (!process.env.API_KEY) {
        this.onError("API KEY ERROR");
        return;
    }

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        // CORRECTED CONFIGURATION BELOW
        outputAudioTranscription: {}, 
        inputAudioTranscription: {},
      },
    };

    try {
      const sessionPromise = this.ai.live.connect({
        model: config.model,
        config: config.config as any,
        callbacks: {
          onopen: async () => {
            console.log("NOVA: CONNECTED");
            this.onStatusChange("SYSTEM ONLINE");
            onOpen();
            await this.startRecording(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
             this.handleServerMessage(message);
          },
          onclose: () => {
              this.onStatusChange("DISCONNECTED");
          },
          onerror: (err) => {
              console.error(err);
              this.onError("CONNECTION LOST");
          },
        }
      });
      this.session = sessionPromise;
    } catch (error: any) {
      this.onError(`Connection Failed: ${error.message}`);
    }
  }

  private async startRecording(sessionPromise: Promise<any>) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      if (!this.inputAudioContext) return;
      
      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = this.createBlob(inputData);
        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
      };
      
      this.inputSource.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);
    } catch (err: any) {
      this.onError(`Microphone Error: ${err.message}`);
    }
  }

  private async handleServerMessage(message: LiveServerMessage) {
    const { serverContent } = message;
    
    // Handle Audio Output
    if (serverContent?.modelTurn?.parts?.[0]?.inlineData?.data && this.outputAudioContext) {
      try {
        const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const audioBuffer = await this.decodeAudioData(this.base64ToBytes(base64Audio), this.outputAudioContext);
        
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode!);
        source.start(this.nextStartTime);
        
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
      } catch (e) {
        console.error("Audio Decode Error", e);
      }
    }

    // Handle Transcription (Subtitles)
    if (serverContent?.outputTranscription?.text) {
        const text = serverContent.outputTranscription.text;
        this.analyzeSentimentAndActions(text);
    }
    
    // Handle Interruption
    if (serverContent?.interrupted) {
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  // Deduce expressions from natural speech text
  private analyzeSentimentAndActions(text: string) {
      const lower = text.toLowerCase();
      let expression = "neutral";
      let gesture = "idle";
      
      if (lower.includes("?")) expression = "curious";
      if (lower.includes("!")) expression = "excited";
      if (lower.includes("sorry") || lower.includes("apologize")) expression = "sad";
      if (lower.includes("happy") || lower.includes("great") || lower.includes("glad")) expression = "happy";
      if (lower.includes("searching") || lower.includes("checking") || lower.includes("one moment")) gesture = "working";
      if (lower.includes("hello") || lower.includes("hi")) gesture = "wave";

      this.onNovaUpdate({
          speech: text,
          facial_expression: expression,
          gesture: gesture,
          posture: "standing",
          action: "none",
          wake_state: "awake"
      });
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  }
}

export const geminiLiveService = new GeminiLiveService();
