export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'salida' | 'venta' | 'merma';
  quantity: number;
  unitPrice?: number;
  total?: number;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'efectivo' | 'transferencia' | 'expensa' | 'combinado';
  customerName?: string;
  lotNumber?: string;
  paymentBreakdown?: {
    efectivo: number;
    transferencia: number;
    expensa: number;
  };
  createdAt: string;
}

export interface AdminTurn {
  id: string;
  adminName: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'closed';
  sales: Sale[];
  transactions?: WithdrawalTransaction[];
  expenses?: ExpenseTransaction[];
  totals: {
    efectivo: number;
    transferencia: number;
    expensa: number;
    total: number;
  };
  createdAt: string;
  closedAt?: string;
}

export interface WithdrawalTransaction {
  id: string;
  type: 'retiro';
  receiptNumber: string;
  withdrawalId?: string;
  amount: number;
  adminName: string;
  notes: string;
  createdAt: string;
}

export interface ExpenseTransaction {
  id: string;
  type: 'gasto';
  receiptNumber: string;
  withdrawalId?: string;
  concept: string;
  detail: string;
  amount: number;
  paymentMethod: 'efectivo';
  adminName: string;
  createdAt: string;
}

export interface TurnClosure {
  id: string;
  turnId: string;
  adminName: string;
  startDate: string;
  endDate: string;
  sales: Sale[];
  transactions?: WithdrawalTransaction[];
  expenses?: ExpenseTransaction[];
  totals: {
    efectivo: number;
    transferencia: number;
    expensa: number;
    total: number;
  };
  salesCount: number;
  createdAt: string;
}

export interface StockLevel {
  product: Product;
  level: 'high' | 'medium' | 'low' | 'empty';
  percentage: number;
}