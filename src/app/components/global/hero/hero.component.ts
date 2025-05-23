import { Component, Input, ViewChild } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { ApiService } from '../../../api/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  @Input() data: any;
  @Input() mediaType: string = '';
  
  @ViewChild(ModalComponent) modal!: ModalComponent;

  constructor(private apiService: ApiService,
    private router: Router
  ) { }

  openTrailer() {
    const mediaType = this.data.number_of_seasons ? 'tv' : 'movie';
    this.apiService.getYouTubeVideo(this.data.id, mediaType).subscribe(
      (response: any) => {
        const video = response.results.find((vid: any) => vid.site === 'YouTube' && ['Trailer', 'Teaser', 'Clip'].includes(vid.type));
        if (video) {
          const videoUrl = `https://www.youtube.com/embed/${video.key}?rel=0&autoplay=1&mute=1`;
          this.modal.openModal(videoUrl);
        } else {
          console.error('No trailer or relevant video found for this media.');
          alert('No trailer or video available for this media.');
        }
      },
      error => {
        console.error('Error fetching YouTube video:', error);
      }
    );
  }

  onBackdropClickd(data: any) {
    if (this.mediaType === 'movie') {
      this.router.navigate([`/watch/movie/${data.id}`]);
    }
  }
}