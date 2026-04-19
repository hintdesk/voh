import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, switchMap, throwError } from 'rxjs';
import { RadioEpisode } from '../entities/radioEpisode';
import { ProgramService } from './program.service';
import { EpisodeAudioDetail } from '../entities/episodeAudioDetail';

const PROXY = 'https://nextdata.tri-nguyen-8e7.workers.dev/?url=';

@Injectable({ providedIn: 'root' })
export class DataService {
    private http = inject(HttpClient);
    private programService = inject(ProgramService);

    getProgramRadioList(programId: string): Observable<RadioEpisode[]> {
        return this.programService.getProgramById(programId).pipe(
            switchMap((program) => {
                if (!program?.sourceUrl) {
                    return throwError(() => new Error(`Unsupported program id: ${programId}`));
                }

                return this.http
                    .get<any>(`${PROXY}${encodeURIComponent(program.sourceUrl)}`)
                    .pipe(
                        map((res) => res?.props?.pageProps?.pageData?.radioList?.data ?? []),
                        map((list: any[]) =>
                            list.map((item) => ({
                                title: String(item?.title ?? ''),
                                slug: String(item?.slug ?? ''),
                                image: String(item?.image ?? item?.defRadioImage ?? ''),
                            })),
                        ),
                    );
            }),
        );
    }

    getEpisodeAudioDetail(slug: string): Observable<EpisodeAudioDetail> {
        return this.http
            .get<any>(`${PROXY}${encodeURIComponent(slug)}`)
            .pipe(map((res) => {
                const radioDetail = res?.props?.pageProps?.pageData?.radioDetail?.data
                    ?? res?.props?.pageProps?.pageData?.radioDetail
                    ?? null;
                const audioUrl = radioDetail?.audioUrl
                    ?? res?.props?.pageProps?.pageData?.radioDetail?.audioUrl
                    ?? '';
                const image = radioDetail?.image
                    ?? radioDetail?.defRadioImage
                    ?? '';
                const radioDetailId = radioDetail?.id ? String(radioDetail.id) : null;
                return {
                    audioUrl: audioUrl.replace('https://cms.voh.com.vn', 'https://apifb.hintdesk.com'),
                    image: String(image),
                    radioDetailId,
                };
            }));
    }
}
