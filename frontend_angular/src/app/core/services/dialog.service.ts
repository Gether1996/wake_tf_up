import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogData = signal<ConfirmDialogData | null>(null);
  private resolveCallback: ((value: boolean) => void) | null = null;

  readonly activeDialog = this.dialogData.asReadonly();

  confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.dialogData.set({
        ...data,
        confirmText: data.confirmText || 'Confirm',
        cancelText: data.cancelText || 'Cancel',
        type: data.type || 'info'
      });
    });
  }

  handleConfirm() {
    if (this.resolveCallback) {
      this.resolveCallback(true);
      this.close();
    }
  }

  handleCancel() {
    if (this.resolveCallback) {
      this.resolveCallback(false);
      this.close();
    }
  }

  private close() {
    this.dialogData.set(null);
    this.resolveCallback = null;
  }
}
