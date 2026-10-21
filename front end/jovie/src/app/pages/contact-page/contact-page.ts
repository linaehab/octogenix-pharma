import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ContactSection } from '../../components/contact-section/contact-section';
import { RouteIntro } from '../../components/route-intro/route-intro';

@Component({
  selector: 'app-contact-page',
  imports: [RouteIntro, ContactSection, TranslatePipe],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.css',
})
export class ContactPage {}
