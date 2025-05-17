import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of, BehaviorSubject, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

interface SheetInfo {
  sheetName: string;
  data: any[][];
}

interface DownloadInfo {
  'Sheet Name': string;
  'Size': string;
  'Download Link': string;
  'VMF Code': string;
}

@Injectable({
  providedIn: 'root'
})
export class SpreadsheetService {
  private spreadsheetIds = [
    '1QfG84of1a2OcUoIhFfPugXudyhwiRH3F-g2MLhaPjos',
    '1ouLbT5GRUOGgVpx_sS9qYivGytf4yBdubWURjq-LhLs'
  ];
  private apiKey = 'AIzaSyBP4xj1jX_KFM-sY8m_9pgq0TAugxKwcZA';
  private baseUrls = this.spreadsheetIds.map(id => `https://sheets.googleapis.com/v4/spreadsheets/${id}`);
  private excludedKeywords = ['home', 'news', 'trending', 'bbcode', 'phim bộ'];
  private readonly POLLING_INTERVAL = 30000; // 30 seconds
  private readonly CACHE_DURATION = 300000; // 5 minutes
  private downloadDataSubject = new BehaviorSubject<{ [key: number]: DownloadInfo[] }>({});
  private lastUpdateTime: { [key: number]: number } = {};
  private pollingSubscriptions: { [key: number]: any } = {};
  private cache: { [key: number]: { data: DownloadInfo[], timestamp: number } } = {};
  private lastSuccessfulUpdate: { [key: number]: number } = {};

  constructor(private http: HttpClient) { }

  // Phương thức để subscribe đến dữ liệu download
  getDownloadData(tmdbId: number): Observable<DownloadInfo[]> {
    const now = Date.now();
    
    // Kiểm tra cache trước
    if (this.cache[tmdbId] && now - this.cache[tmdbId].timestamp < this.CACHE_DURATION) {
      return of(this.cache[tmdbId].data);
    }

    // Nếu chưa có dữ liệu hoặc dữ liệu cũ hơn 5 phút, cập nhật
    if (!this.lastUpdateTime[tmdbId] || now - this.lastUpdateTime[tmdbId] > this.CACHE_DURATION) {
      this.updateDownloadData(tmdbId);
    }

    return this.downloadDataSubject.pipe(
      map(data => data[tmdbId] || [])
    );
  }

  // Phương thức cập nhật dữ liệu
  private updateDownloadData(tmdbId: number) {
    const now = Date.now();
    
    // Kiểm tra cache trước khi gọi API
    if (this.cache[tmdbId] && now - this.cache[tmdbId].timestamp < this.CACHE_DURATION) {
      const cachedData = this.cache[tmdbId].data.map(item => ({
        ...item,
        'VMF Code': item['VMF Code'] || 'N/A' // Đảm bảo trường mới luôn có giá trị
      }));
      
      this.downloadDataSubject.next({
        ...this.downloadDataSubject.value,
        [tmdbId]: cachedData
      });
      return;
    }

    // Lưu cache cũ để sử dụng nếu cập nhật thất bại
    const oldCache = this.cache[tmdbId];

    // Lấy dữ liệu từ cả hai spreadsheet
    forkJoin([
      this.getTvDownloadInfo(tmdbId, 0),
      this.getTvDownloadInfo(tmdbId, 1)
    ]).subscribe({
      next: ([data1, data2]) => {
        const combinedData = [...data1, ...data2].map(item => ({
          ...item,
          'VMF Code': item['VMF Code'] || 'N/A' // Đảm bảo trường mới luôn có giá trị
        }));
        
        const currentData = this.downloadDataSubject.value;
        
        // Chỉ cập nhật nếu dữ liệu thực sự thay đổi
        if (JSON.stringify(currentData[tmdbId]) !== JSON.stringify(combinedData)) {
          // Cập nhật cache
          this.cache[tmdbId] = {
            data: combinedData,
            timestamp: now
          };
          this.lastSuccessfulUpdate[tmdbId] = now;

          this.downloadDataSubject.next({
            ...currentData,
            [tmdbId]: combinedData
          });
          console.log('Download data updated for tmdbId:', tmdbId);
        }
        
        this.lastUpdateTime[tmdbId] = now;
      },
      error: (error) => {
        console.error('Error updating download data:', error);
        
        // Nếu có lỗi và có cache cũ, sử dụng cache cũ
        if (oldCache) {
          // Kiểm tra xem cache cũ có quá cũ không
          const cacheAge = now - oldCache.timestamp;
          if (cacheAge < this.CACHE_DURATION * 2) { // Cho phép sử dụng cache cũ gấp đôi thời gian cache bình thường
            const cachedData = oldCache.data.map(item => ({
              ...item,
              'VMF Code': item['VMF Code'] || 'N/A' // Đảm bảo trường mới luôn có giá trị
            }));
            
            this.cache[tmdbId] = {
              data: cachedData,
              timestamp: oldCache.timestamp
            };
            
            this.downloadDataSubject.next({
              ...this.downloadDataSubject.value,
              [tmdbId]: cachedData
            });
            console.log('Using old cache due to update failure for tmdbId:', tmdbId);
          } else {
            // Nếu cache cũ quá cũ, xóa cache
            delete this.cache[tmdbId];
            this.downloadDataSubject.next({
              ...this.downloadDataSubject.value,
              [tmdbId]: []
            });
            console.log('Cache too old, cleared for tmdbId:', tmdbId);
          }
        } else {
          // Nếu không có cache cũ, xóa cache hiện tại
          delete this.cache[tmdbId];
          this.downloadDataSubject.next({
            ...this.downloadDataSubject.value,
            [tmdbId]: []
          });
          console.log('No cache available for tmdbId:', tmdbId);
        }
      }
    });
  }

  // Bắt đầu polling cho một tmdbId cụ thể
  startPolling(tmdbId: number) {
    // Dừng polling cũ nếu có
    this.stopPolling(tmdbId);

    // Bắt đầu polling mới với interval dài hơn
    this.pollingSubscriptions[tmdbId] = timer(0, this.POLLING_INTERVAL)
      .pipe(
        catchError(error => {
          console.error('Polling error:', error);
          return of(null);
        })
      )
      .subscribe(() => {
        const now = Date.now();
        // Chỉ cập nhật nếu cache đã hết hạn
        if (!this.cache[tmdbId] || now - this.cache[tmdbId].timestamp >= this.CACHE_DURATION) {
          this.updateDownloadData(tmdbId);
        }
      });
  }

  // Dừng polling cho một tmdbId cụ thể
  stopPolling(tmdbId?: number) {
    if (tmdbId) {
      if (this.pollingSubscriptions[tmdbId]) {
        this.pollingSubscriptions[tmdbId].unsubscribe();
        delete this.pollingSubscriptions[tmdbId];
      }
    } else {
      // Dừng tất cả polling
      Object.values(this.pollingSubscriptions).forEach(subscription => {
        subscription.unsubscribe();
      });
      this.pollingSubscriptions = {};
    }
  }

  getMovieDownloadInfo(tmdbId: number): Observable<DownloadInfo[]> {
    // Lấy dữ liệu từ cả hai spreadsheet
    return forkJoin([
      this.getMovieDownloadInfoFromSheet(tmdbId, 0),
      this.getMovieDownloadInfoFromSheet(tmdbId, 1)
    ]).pipe(
      map(([data1, data2]) => [...data1, ...data2])
    );
  }

  private getMovieDownloadInfoFromSheet(tmdbId: number, sheetIndex: number): Observable<DownloadInfo[]> {
    return this.http.get(`${this.baseUrls[sheetIndex]}?key=${this.apiKey}`).pipe(
      switchMap((spreadsheetInfo: any) => {
        const sheets = spreadsheetInfo.sheets
          .map((sheet: any) => sheet.properties.title)
          .filter((sheetName: string) => {
            const lowerSheetName = sheetName.toLowerCase();
            return !this.excludedKeywords.some(keyword => lowerSheetName.includes(keyword.toLowerCase()));
          });
        
        console.log(`Available sheets after filtering for movie (sheet ${sheetIndex}):`, sheets);
        
        const sheetRequests = sheets.map((sheetName: string) => 
          this.http.get(`${this.baseUrls[sheetIndex]}/values/${sheetName}!A:AO?key=${this.apiKey}`).pipe(
            map((response: any) => ({
              sheetName,
              data: response.values
            } as SheetInfo)),
            catchError(() => of({ sheetName, data: [] } as SheetInfo))
          )
        );

        return (forkJoin(sheetRequests) as Observable<SheetInfo[]>).pipe(
          map((results: SheetInfo[]) => {
            const allMatches: DownloadInfo[] = [];
            const processedLinks = new Set<string>();
            
            for (const result of results) {
              if (!result.data || result.data.length === 0) {
                console.log(`Sheet ${result.sheetName} is empty`);
                continue;
              }
              
              const data = result.data.slice(1);
              console.log(`Processing sheet ${result.sheetName}, rows: ${data.length}`);
              
              const movies = data.filter((row: any) => {
                const hasTmdbId = row[7] === tmdbId.toString();
                const hasDownloadLink = row[1] && typeof row[1] === 'string' && row[1].trim().length > 0;
                
                if (hasTmdbId && !hasDownloadLink) {
                  console.log(`Found matching TMDb ID but no download link in sheet ${result.sheetName}`);
                }
                
                return hasTmdbId && hasDownloadLink;
              });
              
              console.log(`Found ${movies.length} matches in sheet ${result.sheetName}`);
              
              movies.forEach(movie => {
                const downloadLink = movie[1]?.trim();
                
                if (processedLinks.has(downloadLink)) {
                  console.log('Skipping duplicate link:', downloadLink);
                  return;
                }
                
                const size = movie[36]?.trim() || 'N/A';
                const vmfCode = this.extractVMFCode(movie[8]?.trim() || ''); // Lấy từ cột I (index 8)
                
                if (!downloadLink) {
                  console.log('Skipping row - no download link');
                  return;
                }
                
                const match: DownloadInfo = {
                  'Sheet Name': result.sheetName,
                  'Size': size,
                  'Download Link': downloadLink,
                  'VMF Code': vmfCode
                };
                
                console.log(`Adding match from sheet ${result.sheetName}:`, match);
                allMatches.push(match);
                processedLinks.add(downloadLink);
              });
            }
            
            console.log('Final results:', allMatches);
            return allMatches;
          })
        );
      }),
      catchError(error => {
        console.error('Error fetching spreadsheet info:', error);
        return of([]);
      })
    );
  }

  getTvDownloadInfo(tmdbId: number, sheetIndex: number = 0): Observable<DownloadInfo[]> {
    return this.http.get(`${this.baseUrls[sheetIndex]}?key=${this.apiKey}`).pipe(
        switchMap((spreadsheetInfo: any) => {
            const sheets = spreadsheetInfo.sheets
                .map((sheet: any) => sheet.properties.title)
                .filter((sheetName: string) => {
                    const lowerSheetName = sheetName.toLowerCase();
                    return lowerSheetName.includes('phim bộ');
                });
            
            console.log(`Available sheets after filtering for TV (sheet ${sheetIndex}):`, sheets);
            
            if (sheets.length === 0) {
                console.log('No TV sheets found');
                return of([]);
            }
            
            const sheetRequests = sheets.map((sheetName: string) => 
                this.http.get(`${this.baseUrls[sheetIndex]}/values/${sheetName}!A:AO?key=${this.apiKey}`).pipe(
                    map((response: any) => ({
                        sheetName,
                        data: response.values || []
                    } as SheetInfo)),
                    catchError(() => of({ sheetName, data: [] } as SheetInfo))
                )
            );

            return (forkJoin(sheetRequests) as Observable<SheetInfo[]>).pipe(
                map((results: SheetInfo[]) => {
                    const allMatches: DownloadInfo[] = [];
                    const processedLinks = new Set<string>();
                    
                    for (const result of results) {
                        if (!result.data || result.data.length <= 1) {
                            console.log(`Sheet ${result.sheetName} is empty or has only header`);
                            continue;
                        }
                        
                        const data = result.data.slice(1);
                        console.log(`Processing sheet ${result.sheetName}, rows: ${data.length}`);
                        
                        const movies = data.filter((row: any) => {
                            if (!row || row.length < 8) return false;
                            
                            const hasTmdbId = row[7] === tmdbId.toString();
                            const hasDownloadLink = row[1] && typeof row[1] === 'string' && row[1].trim().length > 0;
                            
                            if (hasTmdbId && !hasDownloadLink) {
                                console.log(`Found matching TMDb ID but no download link in sheet ${result.sheetName}`);
                            }
                            
                            return hasTmdbId && hasDownloadLink;
                        });
                        
                        console.log(`Found ${movies.length} matches in sheet ${result.sheetName}`);
                        
                        movies.forEach(movie => {
                            const downloadLink = movie[1]?.trim();
                            
                            if (processedLinks.has(downloadLink)) {
                                console.log('Skipping duplicate link:', downloadLink);
                                return;
                            }
                            
                            const size = movie[36]?.trim() || 'N/A';
                            const vmfCode = this.extractVMFCode(movie[8]?.trim() || ''); // Lấy từ cột I (index 8)
                            
                            if (!downloadLink) {
                                console.log('Skipping row - no download link');
                                return;
                            }
                            
                            const match: DownloadInfo = {
                                'Sheet Name': result.sheetName,
                                'Size': size,
                                'Download Link': downloadLink,
                                'VMF Code': vmfCode
                            };
                            
                            console.log(`Adding match from sheet ${result.sheetName}:`, match);
                            allMatches.push(match);
                            processedLinks.add(downloadLink);
                        });
                    }
                    
                    console.log('Final results:', allMatches);
                    return allMatches;
                })
            );
        }),
        catchError(error => {
            console.error('Error fetching spreadsheet info:', error);
            return of([]);
        })
    );
  }

  // Thêm hàm helper để trích xuất VMF Code từ URL
  private extractVMFCode(url: string): string {
    if (!url) return 'N/A';
    
    // Nếu URL là tinyurl, lấy phần cuối sau dấu /
    if (url.includes('tinyurl.com/')) {
      const parts = url.split('/');
      return parts[parts.length - 1] || 'N/A';
    }
    
    // Nếu không phải tinyurl, trả về giá trị gốc
    return url;
  }
} 