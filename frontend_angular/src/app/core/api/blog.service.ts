import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BlogPost, PaginatedResponse } from './api.models';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  constructor(private api: ApiService) {}

  getPosts(params?: { page?: number; page_size?: number }): Observable<PaginatedResponse<BlogPost>> {
    return this.api.get<PaginatedResponse<BlogPost>>('blog/', params);
  }

  getPost(slug: string): Observable<BlogPost> {
    return this.api.get<BlogPost>(`blog/${slug}/`);
  }
}
