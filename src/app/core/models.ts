export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  desc: string;
  price: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderPayload {
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  items: CartItem[];
  total: number;
}

export interface Order {
  id: string;
  uid: string;
  email: string | null;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  items: CartItem[];
  total: number;
  calculatedTotal: number;
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  createdAt: string | null;
}
