import { Component } from '@angular/core';

/** The official clip shapes, rendered once in the Jovie layout and used as clip-path: url(#jv-...). */
@Component({
  selector: 'app-jovie-masks',
  templateUrl: './jovie-masks.html',
  styles: ':host, svg { position: absolute; width: 0; height: 0; overflow: hidden; }',
  host: { 'aria-hidden': 'true' },
})
export class JovieMasks {}
