import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../core/services/dialog.service';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    @if (dialogService.activeDialog(); as dialog) {
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 bg-black/50 z-[9998] animate-fade-in"
        (click)="dialogService.handleCancel()">
      </div>

      <!-- Dialog -->
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div 
          class="bg-background border border-border rounded-lg shadow-xl max-w-md w-full animate-scale-in"
          (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="p-6 border-b border-border">
            <div class="flex items-center gap-3">
              @switch (dialog.type) {
                @case ('danger') {
                  <div class="flex-shrink-0 w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                }
                @case ('warning') {
                  <div class="flex-shrink-0 w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                }
                @default {
                  <div class="flex-shrink-0 w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                }
              }
              <h3 class="text-lg font-bold">{{ dialog.title }}</h3>
            </div>
          </div>

          <!-- Body -->
          <div class="p-6">
            <p class="text-muted-foreground">{{ dialog.message }}</p>
          </div>

          <!-- Footer -->
          <div class="p-6 border-t border-border flex gap-3 justify-end">
            <app-button 
              [variant]="'outline'"
              (clicked)="dialogService.handleCancel()">
              {{ dialog.cancelText }}
            </app-button>
            <app-button 
              [variant]="dialog.type === 'danger' ? 'danger' : 'primary'"
              (clicked)="dialogService.handleConfirm()">
              {{ dialog.confirmText }}
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }

    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
  `]
})
export class ConfirmDialogComponent {
  dialogService = inject(DialogService);
}
