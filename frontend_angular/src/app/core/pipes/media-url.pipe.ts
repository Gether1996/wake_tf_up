import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'mediaUrl',
  standalone: true
})
export class MediaUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    
    // If it's already a full URL (starts with http:// or https://), return as is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    // If it starts with /, prepend the backend base URL
    if (value.startsWith('/')) {
      return `${environment.apiBaseUrl}${value}`;
    }
    
    // Otherwise, assume it's a relative path and prepend backend URL
    return `${environment.apiBaseUrl}/${value}`;
  }
}
