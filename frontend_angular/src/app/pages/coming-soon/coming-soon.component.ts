import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background text-foreground overflow-hidden relative">
      <!-- Animated background dots -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="dot" [style.left.%]="15" [style.top.%]="20" style="animation-delay: 0s;"></div>
        <div class="dot" [style.left.%]="85" [style.top.%]="15" style="animation-delay: 0.3s;"></div>
        <div class="dot" [style.left.%]="10" [style.top.%]="75" style="animation-delay: 0.6s;"></div>
        <div class="dot" [style.left.%]="90" [style.top.%]="80" style="animation-delay: 0.9s;"></div>
        <div class="dot" [style.left.%]="50" [style.top.%]="10" style="animation-delay: 1.2s;"></div>
        <div class="dot" [style.left.%]="30" [style.top.%]="50" style="animation-delay: 1.5s;"></div>
        <div class="dot" [style.left.%]="70" [style.top.%]="60" style="animation-delay: 1.8s;"></div>
      </div>

      <!-- Main content -->
      <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <!-- Logo/Icon with pulse animation -->
        <div class="mb-8 inline-block pulse-glow">
          <div class="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center shadow-2xl">
            <span class="text-5xl">{{ emojis()[currentEmojiIndex()] }}</span>
          </div>
        </div>

        <!-- Coming Soon Text -->
        <h1 class="text-6xl md:text-8xl font-heading mb-6 tracking-tight">
          <span class="text-gradient">COMING SOON</span>
        </h1>

        <!-- Subtitle -->
        <p class="text-xl md:text-2xl mb-12 text-muted-foreground font-mono uppercase tracking-wider">
          <span class="type-writer">{{ displayedText() }}</span>
          <span class="cursor-blink">_</span>
        </p>

        <!-- Animated loading bars -->
        <div class="max-w-md mx-auto mb-12 space-y-3">
          <div class="progress-bar">
            <div class="progress-fill" style="animation-delay: 0s; animation-duration: 2s;"></div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="animation-delay: 0.3s; animation-duration: 2.3s;"></div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="animation-delay: 0.6s; animation-duration: 2.6s;"></div>
          </div>
        </div>

        <!-- Additional info -->
        <div class="flex flex-wrap justify-center gap-4 mb-8">
          <div class="badge-modern">
            <span class="font-mono">⚡</span> PREPARING
          </div>
          <div class="badge-modern">
            <span class="font-mono">🚀</span> LAUNCHING
          </div>
          <div class="badge-modern">
            <span class="font-mono">✨</span> PERFECTING
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Text gradient animation */
    .text-gradient {
      background: linear-gradient(90deg, 
        rgb(var(--foreground)), 
        rgb(var(--accent)), 
        rgb(var(--foreground))
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }

    @keyframes shimmer {
      0% { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    /* Pulse glow effect */
    .pulse-glow {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        filter: brightness(1);
      }
      50% {
        transform: scale(1.05);
        filter: brightness(1.2);
      }
    }

    /* Cursor blink */
    .cursor-blink {
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    /* Progress bars */
    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgb(var(--muted));
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, 
        rgb(var(--foreground)), 
        rgb(var(--accent))
      );
      animation: fillProgress 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes fillProgress {
      0% {
        width: 0%;
        opacity: 1;
      }
      50% {
        width: 100%;
        opacity: 1;
      }
      100% {
        width: 100%;
        opacity: 0.3;
      }
    }

    /* Animated dots */
    .dot {
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: radial-gradient(circle, 
        rgba(var(--accent), 0.3) 0%, 
        rgba(var(--accent), 0) 70%
      );
      animation: float 6s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes float {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.3;
      }
      50% {
        transform: translate(-30px, -30px) scale(1.2);
        opacity: 0.6;
      }
    }

    /* Badge modern */
    .badge-modern {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: rgb(var(--muted));
      color: rgb(var(--foreground));
      border: 1px solid rgb(var(--border));
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      transition: all 0.3s ease;
    }

    .badge-modern:hover {
      background: rgb(var(--foreground));
      color: rgb(var(--background));
      transform: translateY(-2px);
    }

    /* Custom font for headings */
    .font-heading {
      font-family: 'Shlop', 'Inter', system-ui, sans-serif;
    }
  `]
})
export class ComingSoonComponent implements OnInit, OnDestroy {
  emojis = signal(['⚡', '🚀', '✨', '💎', '🔥', '⭐', '🌟', '💫']);
  currentEmojiIndex = signal(0);
  

  
  typeWriterTexts = [
    'We\'re Building Something Epic',
    'Worth The Wait',
    'Coming Very Soon',
    'Stay Tuned For Magic'
  ];
  currentTextIndex = 0;
  displayedText = signal('');
  
  private emojiInterval?: number;
  private typeWriterTimeout?: number;

  ngOnInit() {
    // Rotate emojis every 2 seconds
    this.emojiInterval = window.setInterval(() => {
      this.currentEmojiIndex.update(i => (i + 1) % this.emojis().length);
    }, 2000);

    // Start typewriter effect
    this.typeWriter();
  }

  ngOnDestroy() {
    if (this.emojiInterval) {
      clearInterval(this.emojiInterval);
    }
    if (this.typeWriterTimeout) {
      clearTimeout(this.typeWriterTimeout);
    }
  }

  typeWriter() {
    const text = this.typeWriterTexts[this.currentTextIndex];
    let charIndex = 0;
    
    const type = () => {
      if (charIndex < text.length) {
        this.displayedText.update(current => current + text.charAt(charIndex));
        charIndex++;
        this.typeWriterTimeout = window.setTimeout(type, 100);
      } else {
        // Wait 2 seconds before erasing
        this.typeWriterTimeout = window.setTimeout(() => {
          this.eraseText();
        }, 2000);
      }
    };
    
    type();
  }

  eraseText() {
    const erase = () => {
      if (this.displayedText().length > 0) {
        this.displayedText.update(current => current.slice(0, -1));
        this.typeWriterTimeout = window.setTimeout(erase, 50);
      } else {
        // Move to next text
        this.currentTextIndex = (this.currentTextIndex + 1) % this.typeWriterTexts.length;
        this.typeWriterTimeout = window.setTimeout(() => {
          this.typeWriter();
        }, 500);
      }
    };
    
    erase();
  }
}
