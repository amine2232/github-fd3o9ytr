import { Application, Device } from '@nativescript/core';

export class SpeechRecognitionService {
  private androidRecognizer: android.speech.SpeechRecognizer;
  private iosRecognizer: any; // AVSpeechRecognizer
  private isListening = false;
  private shouldContinueListening = false;

  constructor() {
    if (global.isAndroid) {
      this.initializeAndroid();
    } else if (global.isIOS) {
      this.initializeIOS();
    }
  }

  private initializeAndroid() {
    if (!this.hasRecordPermission()) {
      this.requestRecordPermission();
    }
    
    this.androidRecognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(
      Application.android.context
    );
  }

  private initializeIOS() {
    if (global.isIOS) {
      this.iosRecognizer = AVSpeechRecognizer.new();
      // Request authorization
      AVSpeechRecognizer.requestAuthorization((status) => {
        console.log('Speech recognition authorization status:', status);
      });
    }
  }

  private hasRecordPermission(): boolean {
    if (global.isAndroid) {
      const permission = android.Manifest.permission.RECORD_AUDIO;
      const hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED;
      const context = Application.android.context;
      return android.content.pm.PackageManager.PERMISSION_GRANTED === 
        context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO);
    }
    return true;
  }

  private requestRecordPermission() {
    if (global.isAndroid) {
      const activity = Application.android.foregroundActivity || Application.android.startActivity;
      const permission = android.Manifest.permission.RECORD_AUDIO;
      activity.requestPermissions([permission], 1234);
    }
  }

  startListening(callback: (text: string, isFinal: boolean) => void) {
    if (this.isListening) return;
    
    if (!this.hasRecordPermission()) {
      this.requestRecordPermission();
      return;
    }

    this.isListening = true;
    this.shouldContinueListening = true;

    if (global.isAndroid) {
      const startAndroidListening = () => {
        if (!this.shouldContinueListening) return;

        const intent = new android.content.Intent(
          android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH
        );
        // Configure for continuous dictation
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS,
          100000
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS,
          100000
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
          100000
        );
        // Set language to Arabic
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_LANGUAGE,
          'ar-SA'
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,
          'ar-SA'
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
          android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_MAX_RESULTS,
          5
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS,
          true
        );
        intent.putExtra(
          android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE,
          Application.android.context.getPackageName()
        );

        const listener = new android.speech.RecognitionListener({
          onResults: (results) => {
            const matches = results.getStringArrayList(
              android.speech.SpeechRecognizer.RESULTS_RECOGNITION
            );
            if (matches && matches.size() > 0) {
              callback(matches.get(0), false); // Changed to false to keep listening
            }
            // Restart listening immediately
            setTimeout(() => {
              if (this.shouldContinueListening) {
                startAndroidListening();
              }
            }, 50);
          },
          onPartialResults: (partialResults) => {
            const matches = partialResults.getStringArrayList(
              android.speech.SpeechRecognizer.RESULTS_RECOGNITION
            );
            if (matches && matches.size() > 0) {
              callback(matches.get(0), false);
            }
          },
          onError: (error) => {
            console.error('Speech recognition error:', error);
            // Log the specific error code
            const errorMessage = (() => {
              switch (error) {
                case android.speech.SpeechRecognizer.ERROR_AUDIO:
                  return 'Audio recording error';
                case android.speech.SpeechRecognizer.ERROR_CLIENT:
                  return 'Client side error';
                case android.speech.SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                  return 'Insufficient permissions';
                case android.speech.SpeechRecognizer.ERROR_NETWORK:
                  return 'Network error';
                case android.speech.SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                  return 'Network timeout';
                case android.speech.SpeechRecognizer.ERROR_NO_MATCH:
                  return 'No recognition match';
                case android.speech.SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                  return 'Recognition service busy';
                case android.speech.SpeechRecognizer.ERROR_SERVER:
                  return 'Server error';
                case android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                  return 'No speech input';
                default:
                  return 'Unknown error';
              }
            })();
            console.log('Speech recognition error details:', errorMessage);
            // Restart listening on error after a short delay
            setTimeout(() => {
              if (this.shouldContinueListening) {
                startAndroidListening();
              }
            }, 100);
          },
          onEndOfSpeech: () => {
            console.log('Speech ended');
            if (this.shouldContinueListening) {
              // Increase delay before restarting to prevent rapid cycling
              setTimeout(startAndroidListening, 300);
            }
          },
          onReadyForSpeech: (params) => {
            console.log('Ready for speech');
          },
          onBeginningOfSpeech: () => {
            console.log('Speech began');
          },
          onRmsChanged: () => {},
          onBufferReceived: () => {},
          onEvent: () => {}
        });

        this.androidRecognizer.setRecognitionListener(listener);
        this.androidRecognizer.startListening(intent);
      };

      startAndroidListening();
    } else if (global.isIOS) {
      const recognitionRequest = SFSpeechAudioBufferRecognitionRequest.new();
      recognitionRequest.shouldReportPartialResults = true;
      // Disable task hints that might cause interruption
      recognitionRequest.taskHint = SFSpeechRecognitionTaskHint.Dictation;
      
      // Configure audio session for long-form speech
      const audioSession = AVAudioSession.sharedInstance();
      const options = AVAudioSessionCategoryOptions.DefaultToSpeaker |
                     AVAudioSessionCategoryOptions.AllowBluetooth |
                     AVAudioSessionCategoryOptions.MixWithOthers;

      try {
        audioSession.setCategoryWithOptionsError(
          AVAudioSessionCategoryRecord,
          options
        );
        // Set audio session mode for voice processing
        audioSession.setModeError(AVAudioSessionModeMeasurement);
        audioSession.setActiveWithOptionsError(true, 0);
      } catch (error) {
        console.error('Error setting up audio session:', error);
        return;
      }

      const startIOSListening = () => {
        if (!this.shouldContinueListening) return;

        this.iosRecognizer.recognitionTaskWithRequestResultHandler(
          recognitionRequest,
          (result, error) => {
            if (error) {
              console.error('Speech recognition error:', error);
              // Restart listening on error after a short delay
              setTimeout(() => {
                if (this.shouldContinueListening) {
                  startIOSListening();
                }
              }, 1000);
              return;
            }

            if (result) {
              callback(result.bestTranscription.formattedString, false);
            }

            if (result.isFinal) {
              // Restart listening immediately
              setTimeout(() => {
                if (this.shouldContinueListening) {
                  startIOSListening();
                }
              }, 50);
            }
          }
        );
      };

      startIOSListening();
    }
  }

  stopListening() {
    this.shouldContinueListening = false;
    this.isListening = false;

    if (global.isAndroid) {
      this.androidRecognizer.stopListening();
    } else if (global.isIOS) {
      this.iosRecognizer.stopRecording();
    }
  }

  cleanup() {
    this.shouldContinueListening = false;
    this.isListening = false;
    
    // Ensure audio session is properly cleaned up on iOS
    if (global.isIOS) {
      try {
        const audioSession = AVAudioSession.sharedInstance();
        audioSession.setActiveWithOptionsError(false, 0);
      } catch (error) {
        console.error('Error deactivating audio session:', error);
      }
    }
    
    if (global.isAndroid) {
      this.androidRecognizer.destroy();
    }
  }
}