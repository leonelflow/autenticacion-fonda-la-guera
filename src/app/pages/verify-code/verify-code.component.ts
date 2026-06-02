import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-code.component.html'
})
export class VerifyCodeComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  code = '';
  message = 'Te enviamos un código de 6 dígitos a tu correo.';

  async verify(): Promise<void> {
    this.message = 'Verificando código...';

    try {
      await this.authService.verifyAccessCode(this.code.trim());
      await this.router.navigateByUrl('/inicio');
    } catch {
      this.message = 'Código incorrecto o vencido. Intenta iniciar sesión otra vez.';
    }
  }
}
