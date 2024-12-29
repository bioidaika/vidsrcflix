import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DataService } from './api/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  searchOpen$!: Observable<boolean>; // Observable for searchOpen
  hideNav!: boolean;
  hideFooter!: boolean;

  constructor(private spinner: NgxSpinnerService, 
    private router: Router,
    private dataService: DataService
  ) {}

  ngOnInit() {
    // reset page while clicking
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo(0, 0);
    });


    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, 2000);

    this.dataService.hideNavAndFooter$.subscribe(state => {
      this.hideNav = state;
      this.hideFooter = state;
    });
  }
}
