import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';

const PROXY = 'https://nextdata.tri-nguyen-8e7.workers.dev/?url=';
const PROGRAM_CATEGORY_URL = 'https://voh.com.vn/radio/chuong-trinh-07240711000000004.html';
const ALLOWED_PROGRAM_IDS = new Set<string>([
  '59b25ca3-2318-4911-92db-f3474d260611',
  '942d56e9-a790-4f39-80e5-1ae38caa8b4d',
]);

export interface ProgramItem {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ProgramService {
  private http = inject(HttpClient);

  private programList$ = this.http
    .get<any>(`${PROXY}${encodeURIComponent(PROGRAM_CATEGORY_URL)}`)
    .pipe(
      map((res) => res?.props?.pageProps?.pageData?.categoryList ?? []),
      map((list: any[]) =>
        list
          .filter((item) => ALLOWED_PROGRAM_IDS.has(String(item?.id ?? '')))
          .map((item) => ({
            id: String(item.id),
            title: String(item.title ?? ''),
            image: String(item.image ?? ''),
            sourceUrl: this.normalizeProgramUrl(String(item.slugUsed ?? item.slug ?? '')),
          })),
      ),
      shareReplay(1),
    );

  getProgramList(): Observable<ProgramItem[]> {
    return this.programList$;
  }

  getProgramById(programId: string): Observable<ProgramItem | null> {
    return this.programList$.pipe(
      map((list) => list.find((item) => item.id === programId) ?? null),
    );
  }

  private normalizeProgramUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (url.startsWith('/')) {
      return `https://voh.com.vn${url}`;
    }

    return `https://voh.com.vn/${url}`;
  }
}
