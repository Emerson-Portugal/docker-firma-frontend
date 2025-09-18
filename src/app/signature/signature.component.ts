import { FooterSignatureComponent } from '@/shared/footer-signature/footer-signature.component';
import { HeaderSignatureComponent } from '@/shared/header-signature/header-signature.component';
import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-signature',
  imports: [RouterOutlet, HeaderSignatureComponent, RouterModule, FooterSignatureComponent], 
  templateUrl: './signature.component.html',
  styles: ``
})
export class SignatureComponent {

}
