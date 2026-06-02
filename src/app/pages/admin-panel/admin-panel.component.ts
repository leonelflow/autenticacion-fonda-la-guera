import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { OrderService } from '../../core/order.service';
import { Order, SessionUser } from '../../core/models';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './admin-panel.component.html'
})
export class AdminPanelComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  user: SessionUser | null = null;
  orders: Order[] = [];
  message = '';

  readonly statuses = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];

  async ngOnInit(): Promise<void> {
    this.user = await this.authService.me();

    if (!this.user) {
      await this.router.navigateByUrl('/login');
      return;
    }

    if (!this.user.isAdmin) {
      this.message = 'Tu cuenta no tiene permisos de administrador.';
      return;
    }

    await this.loadOrders();
  }

  async loadOrders(): Promise<void> {
    try {
      const response = await firstValueFrom(this.orderService.getOrders());
      this.orders = response.orders;
    } catch {
      this.message = 'No se pudieron cargar los pedidos.';
    }
  }

  async updateStatus(order: Order, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value;

    try {
      await firstValueFrom(this.orderService.updateStatus(order.id, status));
      order.status = status as Order['status'];
      this.message = 'Estado actualizado.';
    } catch {
      this.message = 'No se pudo actualizar el estado.';
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  formatDate(value: string | null): string {
    if (!value) return 'Sin fecha';
    return new Date(value).toLocaleString('es-MX');
  }
}
