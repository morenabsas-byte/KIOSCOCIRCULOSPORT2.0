// src/utils/db.ts
import { get, set, del, keys, clear } from 'idb-keyval';
import {
  Product,
  Movement,
  Sale,
  StockLevel,
  AdminTurn,
  TurnClosure
} from '../types';

// ---------- Fallback a localStorage si falla IndexedDB ----------
const storage = {
  async get(key: string) {
    try {
      return await get(key);
    } catch (error) {
      console.warn('IndexedDB failed, using localStorage:', error);
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : undefined;
    }
  },
  async set(key: string, value: any) {
    try {
      await set(key, value);
    } catch (error) {
      console.warn('IndexedDB failed, using localStorage:', error);
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  async del(key: string) {
    try {
      await del(key);
    } catch (error) {
      console.warn('IndexedDB failed, using localStorage:', error);
      localStorage.removeItem(key);
    }
  },
  async keys() {
    try {
      return await keys();
    } catch (error) {
      console.warn('IndexedDB failed, using localStorage:', error);
      return Object.keys(localStorage);
    }
  },
  async clear() {
    try {
      await clear();
    } catch (error) {
      console.warn('IndexedDB failed, using localStorage:', error);
      localStorage.clear();
    }
  }
};

// ---------- Claves ----------
const PRODUCTS_KEY = 'kiosco-products';
const MOVEMENTS_KEY = 'kiosco-movements';
const SALES_KEY = 'kiosco-sales';
const RECEIPT_COUNTER_KEY = 'kiosco-receipt-counter';
const ADMIN_TURNS_KEY = 'kiosco-admin-turns';
const TURN_CLOSURES_KEY = 'kiosco-turn-closures';
const WITHDRAWAL_COUNTER_KEY = 'kiosco-withdrawal-counter';

// ---------- Generadores ----------
const getNextReceiptNumber = async (): Promise<string> => {
  const counter = (await storage.get(RECEIPT_COUNTER_KEY)) || 0;
  const nextCounter = counter + 1;
  await storage.set(RECEIPT_COUNTER_KEY, nextCounter);
  const year = new Date().getFullYear();
  const paddedNumber = nextCounter.toString().padStart(6, '0');
  return `KD-${year}-${paddedNumber}`;
};

const getNextWithdrawalId = async (): Promise<string> => {
  const counter = (await storage.get(WITHDRAWAL_COUNTER_KEY)) || 0;
  const nextCounter = counter + 1;
  await storage.set(WITHDRAWAL_COUNTER_KEY, nextCounter);
  const paddedNumber = nextCounter.toString().padStart(4, '0');
  return `RETIRO-${paddedNumber}`;
};

// ---------- Inicialización por defecto ----------
export const initializeDefaultData = async () => {
  // Productos
  const existingProducts = await getProducts();
  if (existingProducts.length === 0) {
    const defaultProducts: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>> = [
      { name: 'Agua Mineral', category: 'Bebidas', price: 500, stock: 20, minStock: 5 },
      { name: 'Gatorade', category: 'Bebidas', price: 800, stock: 15, minStock: 3 },
      { name: 'Coca Cola', category: 'Bebidas', price: 600, stock: 25, minStock: 5 },
      { name: 'Barrita Cereal', category: 'Snacks', price: 400, stock: 30, minStock: 10 },
      { name: 'Toalla Deportiva', category: 'Deportes', price: 1500, stock: 10, minStock: 2 }
    ];
    for (const product of defaultProducts) {
      await addProduct(product);
    }
  }
};

// ===================================================================
// Productos
// ===================================================================
export const getProducts = async (): Promise<Product[]> => {
  const products = await storage.get(PRODUCTS_KEY);
  return products || [];
};

export const addProduct = async (
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> => {
  const products = await getProducts();
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  products.push(newProduct);
  await storage.set(PRODUCTS_KEY, products);
  return newProduct;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
  const products = await getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;

  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await storage.set(PRODUCTS_KEY, products);
  return products[index];
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  const products = await getProducts();
  const filtered = products.filter(p => p.id !== id);
  if (filtered.length === products.length) return false;

  await storage.set(PRODUCTS_KEY, filtered);
  return true;
};

// ===================================================================
// Movimientos de stock
// ===================================================================
export const getMovements = async (): Promise<Movement[]> => {
  const movements = await storage.get(MOVEMENTS_KEY);
  return movements || [];
};

const updateProductStock = async (productId: string, delta: number): Promise<void> => {
  const products = await getProducts();
  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex !== -1) {
    products[productIndex].stock = Math.max(0, (products[productIndex].stock || 0) + delta);
    products[productIndex].updatedAt = new Date().toISOString();
    await storage.set(PRODUCTS_KEY, products);
  }
};

export const addMovement = async (movement: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> => {
  const movements = await getMovements();
  const newMovement: Movement = {
    ...movement,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };

  movements.push(newMovement);
  await storage.set(MOVEMENTS_KEY, movements);

  // Ajuste de stock
  if (movement.type === 'entrada') {
    await updateProductStock(movement.productId, movement.quantity);
  } else if (movement.type === 'salida' || movement.type === 'venta' || movement.type === 'merma') {
    await updateProductStock(movement.productId, -movement.quantity);
  }

  return newMovement;
};

// ===================================================================
// Ventas
// ===================================================================
export const getSales = async (): Promise<Sale[]> => {
  const sales = await storage.get(SALES_KEY);
  return sales || [];
};

export const addSale = async (sale: Omit<Sale, 'id' | 'receiptNumber' | 'createdAt'>): Promise<Sale> => {
  const sales = await getSales();
  const receiptNumber = await getNextReceiptNumber();

  // Asegurar que paymentBreakdown existe para todos los tipos de pago
  let finalPaymentBreakdown = sale.paymentBreakdown;
  
  if (!finalPaymentBreakdown) {
    // Si no viene paymentBreakdown, crearlo basado en el método de pago
    if (sale.paymentMethod === 'efectivo') {
      finalPaymentBreakdown = { efectivo: sale.total, transferencia: 0, expensa: 0 };
    } else if (sale.paymentMethod === 'transferencia') {
      finalPaymentBreakdown = { efectivo: 0, transferencia: sale.total, expensa: 0 };
    } else if (sale.paymentMethod === 'expensa') {
      finalPaymentBreakdown = { efectivo: 0, transferencia: 0, expensa: sale.total };
    } else {
      // Para 'combinado' sin desglose, distribuir equitativamente (fallback)
      const third = Math.round(sale.total / 3);
      finalPaymentBreakdown = { efectivo: third, transferencia: third, expensa: sale.total - (third * 2) };
    }
  }

  const newSale: Sale = {
    ...sale,
    paymentBreakdown: finalPaymentBreakdown,
    receiptNumber,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };

  sales.push(newSale);
  await storage.set(SALES_KEY, sales);

  // Registrar movimientos por cada item
  for (const item of sale.items) {
    await addMovement({
      productId: item.product.id,
      productName: item.product.name,
      type: 'venta',
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.subtotal,
      notes: `Venta ${receiptNumber}`
    });
  }

  return newSale;
};

// ===================================================================
// Turnos administrativos
// ===================================================================
export const getAdminTurns = async (): Promise<AdminTurn[]> => {
  const turns = await storage.get(ADMIN_TURNS_KEY);
  return turns || [];
};

export const addAdminTurn = async (turn: Omit<AdminTurn, 'id' | 'createdAt'>): Promise<AdminTurn> => {
  const turns = await getAdminTurns();
  const newTurn: AdminTurn = {
    ...turn,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };

  turns.push(newTurn);
  await storage.set(ADMIN_TURNS_KEY, turns);
  return newTurn;
};

export const updateAdminTurn = async (id: string, updates: Partial<AdminTurn>): Promise<AdminTurn | null> => {
  const turns = await getAdminTurns();
  const index = turns.findIndex(t => t.id === id);
  if (index === -1) return null;

  turns[index] = { ...turns[index], ...updates };
  await storage.set(ADMIN_TURNS_KEY, turns);
  return turns[index];
};

export const getActiveTurn = async (): Promise<AdminTurn | null> => {
  const turns = await getAdminTurns();
  return turns.find(turn => turn.status === 'active') || null;
};

// ===================================================================
// Cierres de turno
// ===================================================================
export const getTurnClosures = async (): Promise<TurnClosure[]> => {
  const closures = await storage.get(TURN_CLOSURES_KEY);
  return closures || [];
};

export const addTurnClosure = async (closure: Omit<TurnClosure, 'id' | 'createdAt'>): Promise<TurnClosure> => {
  const closures = await getTurnClosures();
  const newClosure: TurnClosure = {
    ...closure,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };

  closures.push(newClosure);
  await storage.set(TURN_CLOSURES_KEY, closures);
  return newClosure;
};

// ===================================================================
// Transacciones de gastos (retiros)
// ===================================================================
export const addExpenseTransaction = async (
  expense: {
    type: 'retiro' | 'gasto';
    amount: number;
    adminName: string;
    notes?: string;
    concept?: string;
    detail?: string;
    paymentMethod: 'efectivo';
  }
): Promise<any> => {
  const receiptNumber = await getNextReceiptNumber();
  const withdrawalId = expense.type === 'retiro' ? await getNextWithdrawalId() : undefined;

  const newExpense = {
    id: Date.now().toString(),
    receiptNumber,
    withdrawalId,
    createdAt: new Date().toISOString(),
    ...expense
  };

  return newExpense;
};

// ===================================================================
// Stock levels (para dashboards)
// ===================================================================
export const getStockLevels = async (): Promise<StockLevel[]> => {
  const products = await getProducts();
  return products.map(product => {
    const minStock = product.minStock || 5;
    const level =
      product.stock === 0 ? 'empty' :
      product.stock < minStock ? 'low' :
      product.stock < minStock * 2 ? 'medium' : 'high';

    const percentage = Math.min(100, (product.stock / (minStock * 2)) * 100);

    return { product, level, percentage };
  });
};

// ===================================================================
// Backup / Restore
// ===================================================================
export const exportData = async () => {
  const products = await getProducts();
  const movements = await getMovements();
  const sales = await getSales();
  const adminTurns = await getAdminTurns();
  const turnClosures = await getTurnClosures();

  // Contadores
  const receiptCounter = (await storage.get(RECEIPT_COUNTER_KEY)) || 0;
  const withdrawalCounter = (await storage.get(WITHDRAWAL_COUNTER_KEY)) || 0;

  // Transacciones históricas
  let historicalTransactions: any[] = [];
  try {
    const stored = localStorage.getItem('historical-transactions-v1');
    if (stored) historicalTransactions = JSON.parse(stored);
  } catch {
    /* noop */
  }

  return {
    products,
    movements,
    sales,
    adminTurns,
    turnClosures,
    counters: { receiptCounter, withdrawalCounter },
    historicalTransactions,
    systemConfig: {
      isAdmin: localStorage.getItem('kiosco-digital-store')
        ? JSON.parse(localStorage.getItem('kiosco-digital-store') || '{}').state?.isAdmin || false
        : false
    },
    metadata: {
      version: '1.0.0',
      deviceId: localStorage.getItem('device-id'),
      backupType: 'full',
      totalTables: 5,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0'
    }
  };
};

export const importData = async (data: any) => {
  if (data.products) await storage.set(PRODUCTS_KEY, data.products);
  if (data.movements) await storage.set(MOVEMENTS_KEY, data.movements);
  if (data.sales) await storage.set(SALES_KEY, data.sales);
  if (data.adminTurns) await storage.set(ADMIN_TURNS_KEY, data.adminTurns);
  if (data.turnClosures) await storage.set(TURN_CLOSURES_KEY, data.turnClosures);

  if (data.counters) {
    if (typeof data.counters.receiptCounter === 'number') {
      await storage.set(RECEIPT_COUNTER_KEY, data.counters.receiptCounter);
    }
    if (typeof data.counters.withdrawalCounter === 'number') {
      await storage.set(WITHDRAWAL_COUNTER_KEY, data.counters.withdrawalCounter);
    }
  }

  if (data.historicalTransactions && data.historicalTransactions.length > 0) {
    localStorage.setItem('historical-transactions-v1', JSON.stringify(data.historicalTransactions));
  }

  if (data.systemConfig) {
    const currentStore = localStorage.getItem('kiosco-digital-store');
    if (currentStore) {
      const storeData = JSON.parse(currentStore);
      storeData.state = { ...storeData.state, ...data.systemConfig };
      localStorage.setItem('kiosco-digital-store', JSON.stringify(storeData));
    }
  }

  return true;
};

export const clearAllData = async () => {
  await storage.clear();
};