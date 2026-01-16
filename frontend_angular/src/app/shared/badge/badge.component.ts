import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'drop' | 'recycled' | 'preorder' | 'default';

@Component({
  selector: 'app-badge',
  imports: [CommonModule],
  template: `
    <span 
      [class]="'inline-flex items-center px-2 py-1 text-xs font-mono uppercase tracking-wider badge-' + variant()"
      [attr.data-variant]="variant()">
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');
}
