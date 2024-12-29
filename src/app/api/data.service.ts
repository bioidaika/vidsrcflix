import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private hideNavAndFooter: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {}

  get hideNavAndFooter$(): Observable<boolean> {
    return this.hideNavAndFooter.asObservable();
  }

  setHideNavAndFooter(state: boolean): void {
    this.hideNavAndFooter.next(state);
  }
}
