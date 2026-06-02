import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  message = '';

  async register(): Promise<void> {
    this.message = 'Creando cuenta...';

    try {
      await this.authService.register(this.name, this.email.trim(), this.password);
      await this.router.navigateByUrl('/inicio');
    } catch {
      this.message = 'No se pudo crear la cuenta. Verifica los datos.';
    }
  }
}
