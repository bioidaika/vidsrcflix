import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../api/api.service';
import { ActivatedRoute, Params } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { SpreadsheetService } from '../../services/spreadsheet.service';

@Component({
  selector: 'app-tv-info',
  templateUrl: './tv-info.component.html',
  styleUrls: ['./tv-info.component.scss']
})
export class TvInfoComponent implements OnInit, OnDestroy {
  id!: number;
  tv_data: any;
  external_data: any;
  activeTab: string = 'overview';
  video_data: any;
  videos: any[] = [];
  filteredVideos: any[] = [];
  videoTypes: string[] = [];
  backdrops: any[] = [];
  posters: any[] = [];
  cast_data: any;
  recom_data: any[] = [];
  person_data: any;
  type: 'tv' = 'tv';
  downloadData: any = null;
  isLoading = false;
  private previousId: number | null = null;

  constructor(private apiService: ApiService, private router: ActivatedRoute, private spinner: NgxSpinnerService, private spreadsheetService: SpreadsheetService) {}

  ngOnInit() {
    this.router.params.subscribe((params: Params) => {
      this.spinner.show();
      this.id = +params['id'];
      
      if (this.previousId !== this.id) {
        this.activeTab = 'overview';
      }
      
      this.previousId = this.id;
      this.getTvInfo(this.id);
      this.getTvVideos(this.id);
      this.getTvBackdrop(this.id);
      this.getTvCast(this.id);
      this.getTvRecommended(this.id, 1);
      setTimeout(() => {
        this.spinner.hide();
      }, 2000);
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'download' && this.tv_data) {
      this.loadDownloadInfo();
    }
  }

  loadDownloadInfo() {
    if (this.tv_data?.id) {
      if (this.previousId && this.previousId !== this.tv_data.id) {
        this.spreadsheetService.stopPolling();
      }

      this.isLoading = true;
      this.downloadData = null;
      
      this.spreadsheetService.getDownloadData(this.tv_data.id).subscribe({
        next: (data) => {
          this.downloadData = data || [];
          setTimeout(() => {
            this.isLoading = false;
          }, 100);
        },
        error: (error) => {
          console.error('Error loading download info:', error);
          this.downloadData = [];
          this.isLoading = false;
        }
      });

      this.spreadsheetService.startPolling(this.tv_data.id);
      this.previousId = this.tv_data.id;
    }
  }

  ngOnDestroy() {
    this.spreadsheetService.stopPolling();
  }

  getTvInfo(id: number) {
    this.apiService.getTvShow(id).subscribe((result: any) => {
      this.tv_data = result;
      this.getExternal(id);
    });
  }

  getExternal(id: number) {
    this.apiService.getExternalId(id, 'tv').subscribe((result: any) => {
      this.external_data = result;
    });
  }

  getTvVideos(id: number) {
    this.apiService.getYouTubeVideo(id, 'tv').subscribe((res: any) => {
      this.video_data = res.results.length ? res.results[0] : null;
      this.videos = res.results;
      this.filteredVideos = this.videos;
      this.videoTypes = ['ALL', ...new Set(this.videos.map(video => video.type))];
    });
  }

  filterVideos(event: Event): void {
    const filterValue = (event.target as HTMLSelectElement).value;
    this.filteredVideos = filterValue === 'ALL'
      ? this.videos
      : this.videos.filter(video => video.type === filterValue);
  }

  getTvBackdrop(id: number) {
    this.apiService.getBackdrops(id, 'tv').subscribe((res: any) => {
      this.backdrops = res.backdrops;
      this.posters = [];

      res.posters.forEach((poster: { file_path: string; }) => {
        this.posters.push({
          ...poster,
          full_path: `https://image.tmdb.org/t/p/w342${poster.file_path}`
        });
      });
    });
  }

  getTvCast(id: number) {
    this.apiService.getCredits(id, 'tv').subscribe(
      (res: any) => {
        this.cast_data = res.cast.map((item: any) => ({
          link: `/person/${item.id}`,
          imgSrc: item.profile_path ? `https://image.tmdb.org/t/p/w370_and_h556_bestv2${item.profile_path}` : null,
          name: item.name,
          character: item.character,
          popularity: item.popularity,
        }));
      },
      error => {
        console.error('Error fetching credits data', error);
      }
    );
  }

  getTvRecommended(id: number, page: number) {
    this.apiService.getRecommended(id, page, 'tv').subscribe(
      (res: any) => {
        this.recom_data = res.results.map((item: any) => ({
          link: `/tv/${item.id}`,
          imgSrc: item.poster_path ? `https://image.tmdb.org/t/p/w370_and_h556_bestv2${item.poster_path}` : null,
          title: item.name,
          vote: item.vote_average ? item.vote_average : 'N/A',
          rating: item.vote_average ? item.vote_average * 10 : 'N/A',
        }));
      },
      error => {
        console.error('Error fetching recommended movies data', error);
      }
    );
  }

}
