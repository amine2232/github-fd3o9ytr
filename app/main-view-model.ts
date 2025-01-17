import { Observable } from '@nativescript/core';
import { SpeechRecognitionService } from './speech-recognition.service';

export class MainViewModel extends Observable {
  private speechRecognition: SpeechRecognitionService;
  private _isRecording: boolean = false;
  private _recognizedText: string = '';
  private _originalText: string = 'بسم الله الرحمن الرحيم | الحمد لله رب العالمين | الرحمن الرحيم | مالك يوم الدين | إياك نعبد وإياك نستعين | اهدنا الصراط المستقيم | صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين';
  private _isTextVisible: boolean = true;
  private _words: string[] = [];
  private _currentWordIndex: number = 0;
  private _displayedText: string = '';

  constructor() {
    super();
    this.speechRecognition = new SpeechRecognitionService();
    // Split by spaces but keep the separator '|' as a word
    this._words = this._originalText.split(/\s*\|\s*|\s+/);
    this._displayedText = this._originalText;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  get isTextVisible(): boolean {
    return this._isTextVisible;
  }

  get displayedText(): string {
    return this._displayedText;
  }

  set isRecording(value: boolean) {
    if (this._isRecording !== value) {
      this._isRecording = value;
      this.notifyPropertyChange('isRecording', value);
    }
  }

  toggleTextVisibility() {
    this._isTextVisible = !this._isTextVisible;
    this.notifyPropertyChange('isTextVisible', this._isTextVisible);
  }

  private processRecognizedText(text: string) {
    const spokenWords = text.trim().split(/\s+/);
    console.log('Processing text:', text);
    console.log('Current word index:', this._currentWordIndex);
    console.log('Target word:', this._words[this._currentWordIndex]);

    // Find the longest matching sequence
    let bestMatchLength = 0;
    let bestMatchIndex = -1;

    // Look for matches starting from current position
    for (let i = 0; i < spokenWords.length; i++) {
      let matchLength = 0;
      let targetIndex = this._currentWordIndex;
      let spokenIndex = i;

      while (targetIndex < this._words.length && spokenIndex < spokenWords.length) {
        const targetWord = this._words[targetIndex];
        const spokenWord = spokenWords[spokenIndex];

        const normalizedSpoken = this.normalizeArabicText(spokenWord);
        const normalizedTarget = this.normalizeArabicText(targetWord);

        if (normalizedSpoken === normalizedTarget) {
          matchLength++;
          targetIndex++;
          spokenIndex++;
        } else {
          break;
        }
      }

      if (matchLength > bestMatchLength) {
        bestMatchLength = matchLength;
        bestMatchIndex = i;
      }
    }

    // If we found a match, update the progress
    if (bestMatchLength > 0) {
      this._currentWordIndex += bestMatchLength;
      this.updateDisplayedText();
    }
  }

  private normalizeArabicText(text: string): string {
    // Remove diacritics and normalize Arabic characters
    return text
      .replace(/[ـ]/g, '')     // Remove tatweel
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[أإآ]/g, 'ا')  // Normalize alef variations
      .replace(/[ى]/g, 'ي')   // Normalize ya variations
      .replace(/[ة]/g, 'ه')   // Normalize ta marbuta
      .replace(/\s+/g, ' ')   // Normalize spaces
      .trim();
  }

  private updateDisplayedText() {
    // Join words with appropriate spacing and separators
    let displayText = '';
    for (let i = 0; i < this._currentWordIndex; i++) {
      if (this._words[i] === '|') {
        displayText += ' | ';
      } else {
        displayText += (displayText && !displayText.endsWith(' | ') ? ' ' : '') + this._words[i];
      }
    }
    this._displayedText = displayText;
    this.notifyPropertyChange('displayedText', this._displayedText);
  }

  onPushToTalk() {
    if (this.isRecording) {
      this.speechRecognition.stopListening();
      this.isRecording = false;
    } else {
      // Reset progress when starting new recording
      this._currentWordIndex = 0;
      this._displayedText = '';
      this.notifyPropertyChange('displayedText', this._displayedText);
      
      this.isRecording = true;
      this.speechRecognition.startListening((text, isFinal) => {
        if (text) {
          this.processRecognizedText(text);
        }
      });
    }
  }

  resetProgress() {
    this._currentWordIndex = 0;
    this._displayedText = '';
    this.notifyPropertyChange('displayedText', this._displayedText);
  }

  cleanup() {
    this.speechRecognition.cleanup();
  }
}