import { DataService } from './../../api/data.service';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-watch',
  templateUrl: './watch.component.html',
  styleUrl: './watch.component.scss'
})
export class WatchComponent implements OnInit, AfterViewInit, OnDestroy {
  opacity: number = 0;
  @Input() url!: string;
  @ViewChild('iframe') iframeRef!: ElementRef<HTMLIFrameElement>;
  imdbid: any;
  season: number | undefined;
  episode: number | undefined;

  constructor(private route: ActivatedRoute,
    private dataService: DataService
  ) {
    this.route.params.subscribe(params => {
      this.imdbid = params['imdbid'];
      this.season = params['season'] ? +params['season'] : undefined;
      this.episode = params['episode'] ? +params['episode'] : undefined;
      if (!this.season && !this.episode) {
        this.url = `https://vidsrc.cc/v2/embed/movie/${this.imdbid}`;
      }
      else {
        this.url = `https://vidsrc.cc/v2/embed/tv/${this.imdbid}/${this.season}/${this.episode}`;
      }
      this.url = `${this.url}?autoPlay=true`;
    });
  }

  ngOnInit() {
    this.dataService.setHideNavAndFooter(true);
  }

  ngAfterViewInit(): void {
    if (this.iframeRef && this.url) {
      this.iframeRef.nativeElement.src = this.url;
    }
    const iframe = this.iframeRef.nativeElement;
    iframe.addEventListener('load', this.handleIframeLoaded);
  }

  ngOnDestroy() {
    const iframe = this.iframeRef.nativeElement;
    iframe.removeEventListener('load', this.handleIframeLoaded);
  }

  private handleIframeLoaded = () => {
    const iframe = this.iframeRef.nativeElement;
    if (iframe) {
      iframe.style.opacity = '1';
    }
  };
}
