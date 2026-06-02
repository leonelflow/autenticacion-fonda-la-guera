import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { OrderService } from '../../core/order.service';
import { CartItem, MenuItem, SessionUser } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  user: SessionUser | null = null;
  businessName = 'Fonda de Comida';
  message = '';

  menu: MenuItem[] = [
    { id: 'comida-corrida', name: 'Comida corrida', desc: 'Sopa, arroz, guisado, frijoles y agua fresca.', price: 85 },
    { id: 'enchiladas', name: 'Enchiladas verdes', desc: 'Con pollo, crema, queso y ensalada.', price: 75 },
    { id: 'milanesa', name: 'Milanesa con guarnición', desc: 'Milanesa de pollo con arroz y ensalada.', price: 90 },
    { id: 'tacos-guisado', name: 'Tacos de guisado', desc: 'Orden de 4 tacos con salsa de la casa.', price: 55 },
    { id: 'pozole', name: 'Pozole chico', desc: 'Pozole rojo con tostadas y complementos.', price: 80 },
    { id: 'agua', name: 'Agua fresca', desc: 'Jamaica, horchata o limón. 1 litro.', price: 30 }
  ];

  cart: CartItem[] = [];

  orderForm = {
    customerName: '',
    phone: '',
    address: '',
    notes: ''
  };

  async ngOnInit(): Promise<void> {
    this.user = await this.authService.me();
    this.loadCart();

    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      this.businessName = data.businessName || this.businessName;
    } catch {
      this.businessName = 'Fonda de Comida';
    }
  }

  addToCart(product: MenuItem): void {
    const existing = this.cart.find(item => item.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }

    this.saveCart();
  }

  changeQuantity(id: string, delta: number): void {
    const item = this.cart.find(product => product.id === id);
    if (!item) return;

    item.quantity += delta;

    if (item.quantity <= 0) {
      this.removeFromCart(id);
      return;
    }

    this.saveCart();
  }

  removeFromCart(id: string): void {
    this.cart = this.cart.filter(product => product.id !== id);
    this.saveCart();
  }

  get total(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  async submitOrder(): Promise<void> {
    this.message = '';

    if (!this.user) {
      await this.router.navigateByUrl('/login');
      return;
    }

    if (this.cart.length === 0) {
      this.message = 'Agrega productos antes de enviar el pedido.';
      return;
    }

    try {
      const response = await firstValueFrom(
        this.orderService.createOrder({
          ...this.orderForm,
          items: this.cart,
          total: this.total
        })
      );

      this.cart = [];
      this.saveCart();
      this.orderForm = {
        customerName: '',
        phone: '',
        address: '',
        notes: ''
      };

      this.message = `Pedido enviado correctamente. Total: ${response.total.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN'
      })}.`;
    } catch {
      this.message = 'No se pudo enviar el pedido. Verifica tu sesión.';
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  private loadCart(): void {
    const savedCart = localStorage.getItem('cart');
    this.cart = savedCart ? JSON.parse(savedCart) : [];
  }

  private saveCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.cart));
  }
}
