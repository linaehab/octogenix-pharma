import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Each site (Octogenix corporate, Jovie store) brings its own layout through the routes. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
