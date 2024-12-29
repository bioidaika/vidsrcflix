import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  searchVisible = false;
  query: string = '';
  private searchSubject: Subject<string> = new Subject<string>();

  @ViewChild('input') inputElement!: ElementRef;

  constructor(private router: Router) {
    this.searchSubject.pipe(
      debounceTime(500), // Adjust debounce time as needed
      distinctUntilChanged() // Ignore consecutive identical values
    ).subscribe((searchQuery) => {
      this.performNavigation(searchQuery);
    });
  }

  ngAfterViewInit(): void {
    if (this.searchVisible && this.inputElement) {
      this.focusInput();
    }
  }

  toggleSearch(): void {
    this.searchVisible = !this.searchVisible;
    if (this.searchVisible) {
      this.focusInput();
    }
  }

  private focusInput(): void {
    setTimeout(() => {
      if (this.inputElement && this.inputElement.nativeElement) {
        this.inputElement.nativeElement.focus();
        this.inputElement.nativeElement.select();
      }
    }, 100);
  }


  closeSearch(): void {
    this.searchVisible = false;
    this.query = '';
  }

  goToRoute(): void {
    this.searchSubject.next(this.query); // Emit the current query for debouncing
  }

  goBack(): void {
    this.query = '';
    this.router.navigate(['/']);
  }

  private performNavigation(query: string): void {
    if (query.trim()) {
      this.router.navigate(['/search'], { queryParams: { query } });
    } else {
      this.router.navigate(['/']);
    }
  }

  // unFocus(event: FocusEvent): void {
  //   if (!this.query.trim()) {
  //     this.searchVisible = false;
  //   }
  // }

  unFocus(event: FocusEvent): void {
    this.closeSearch(); // Close the search and clear the query
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.goToRoute();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: Event): void {
    const targetElement = event.target as HTMLElement;

    // Close the search bar if the click is outside the navbar
    if (this.searchVisible && !targetElement.closest('.navbar')) {
      this.closeSearch();
    }
  }
}
