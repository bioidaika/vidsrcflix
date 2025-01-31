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
  id: any;
  season: number | undefined;
  episode: number | undefined;

  constructor(private route: ActivatedRoute,
    private dataService: DataService
  ) {
    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.season = params['season'] ? +params['season'] : undefined;
      this.episode = params['episode'] ? +params['episode'] : undefined;
      if (!this.season && !this.episode) {
        this.url = `https://embed.su/embed/movie/${this.id}`;
      }
      else {
        this.url = `https://embed.su/embed/tv/${this.id}/${this.season}/${this.episode}`;
      }
      this.url = `${this.url}`;
    });
  }

  ngOnInit() {
    this.dataService.setHideNavAndFooter(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("✅ Service Worker Registered"))
        .catch(err => console.error("❌ SW Registration Failed:", err));
    }
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
    this.dataService.setHideNavAndFooter(false);
  }

  private handleIframeLoaded = () => {
    const iframe = this.iframeRef.nativeElement;
    if (iframe) {
      iframe.style.opacity = '1';
    }
    //this.requestFullscreen(iframe)
  };

  requestFullscreen(iframe: HTMLIFrameElement) {
    if (iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
  }
}
