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

/* ---------------------------------------------------------------
   Tipos/Helpers para TS (detección de APIs Web/Electron)
---------------------------------------------------------------- */
declare global {
  interface Window {
    electronAPI?: {
      // Debe existir en preload.js / main.js si usás Electron
      saveBackup?: (payload: { filename: string; content: string }) => Promise<void>;
      openBackup?: () => Promise<string | null>;
      chooseBackupFolder?: () => Promise<string | null>;
      setAutoBackup?: (payload: {
        enabled: boolean;
        mode: 'interval' | 'time';
        intervalMinutes?: number;
        time?: string; // "HH:mm"
        folder?: string | null;
      }) => Promise<void>;
      getDataPath?: () => Promise<string>;
    };
    showOpenFilePicker?: any;
    showSaveFilePicker?: any;
    showDirectoryPicker?: any;
  }
}

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
const fsAccessSupported =
  typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';

/* ---------------------------------------------------------------
   Almacenamiento (IndexedDB con fallback a localStorage)
---------------------------------------------------------------- */
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

/* ---------------------------------------------------------------
   Claves
---------------------------------------------------------------- */
const PRODUCTS_KEY = 'kiosco-products';
const MOVEMENTS_KEY = 'kiosco-movements';
const SALES_KEY = 'kiosco-sales';
const RECEIPT_COUNTER_KEY = 'kiosco-receipt-counter';
const ADMIN_TURNS_KEY = 'kiosco-admin-turns';
const TURN_CLOSURES_KEY = 'kiosco-turn-closures';
const WITHDRAWAL_COUNTER_KEY = 'kiosco-withdrawal-counter';

/* ---------------------------------------------------------------
   Generadores
---------------------------------------------------------------- */
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

/* ---------------------------------------------------------------
   Inicialización por defecto
---------------------------------------------------------------- */
export const initializeDefaultData = async () => {
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

/* ===================================================================
   Productos
=================================================================== */
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

/* ===================================================================
   Movimientos de stock
=================================================================== */
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

  if (movement.type === 'entrada') {
    await updateProductStock(movement.productId, movement.quantity);
  } else if (movement.type === 'salida' || movement.type === 'venta' || movement.type === 'merma') {
    await updateProductStock(movement.productId, -movement.quantity);
  }

  return newMovement;
};

/* ===================================================================
   Ventas
=================================================================== */
export const getSales = async (): Promise<Sale[]> => {
  const sales = await storage.get(SALES_KEY);
  return sales || [];
};

export const addSale = async (sale: Omit<Sale, 'id' | 'receiptNumber' | 'createdAt'>): Promise<Sale> => {
  const sales = await getSales();
  const receiptNumber = await getNextReceiptNumber();

  let finalPaymentBreakdown = sale.paymentBreakdown;
  if (!finalPaymentBreakdown) {
    if (sale.paymentMethod === 'efectivo') {
      finalPaymentBreakdown = { efectivo: sale.total, transferencia: 0, expensa: 0 };
    } else if (sale.paymentMethod === 'transferencia') {
      finalPaymentBreakdown = { efectivo: 0, transferencia: sale.total, expensa: 0 };
    } else if (sale.paymentMethod === 'expensa') {
      finalPaymentBreakdown = { efectivo: 0, transferencia: 0, expensa: sale.total };
    } else {
      const third = Math.round(sale.total / 3);
      finalPaymentBreakdown = { efectivo: third, transferencia: third, expensa: sale.total - third * 2 };
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

/* ===================================================================
   Turnos administrativos
=================================================================== */
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

/* ===================================================================
   Cierres de turno
=================================================================== */
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

/* ===================================================================
   Transacciones de gastos (retiros)
=================================================================== */
export const addExpenseTransaction = async (expense: {
  type: 'retiro' | 'gasto';
  amount: number;
  adminName: string;
  notes?: string;
  concept?: string;
  detail?: string;
  paymentMethod: 'efectivo';
}): Promise<any> => {
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

/* ===================================================================
   Stock levels (para dashboards)
=================================================================== */
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

/* ===================================================================
   Backup / Restore  (Exportación/Importación y Auto-Backup)
=================================================================== */

// Estructura de configuración para auto-backup
type AutoBackupConfig = {
  enabled: boolean;
  mode: 'interval' | 'time'; // cada X minutos o a una hora fija HH:mm
  intervalMinutes?: number;
  time?: string; // "HH:mm"
  folder?: string | null; // Ruta (Electron) o etiqueta (Web)
};

const BACKUP_CONFIG_KEY = 'kiosco-backup-config';
const BACKUP_WEB_FOLDER_KEY = 'kiosco-backup-web-folder-name';

// Singleton del intervalo para no duplicar timers
let autoBackupIntervalId: number | null = null;

// Nombre sugerido para el archivo
const buildBackupFilename = () =>
  `backup_kiosco_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

// ---------- Exporta todo el dataset como archivo ----------
export const exportData = async () => {
  const products = await getProducts();
  const movements = await getMovements();
  const sales = await getSales();
  const adminTurns = await getAdminTurns();
  const turnClosures = await getTurnClosures();

  const receiptCounter = (await storage.get(RECEIPT_COUNTER_KEY)) || 0;
  const withdrawalCounter = (await storage.get(WITHDRAWAL_COUNTER_KEY)) || 0;

  let historicalTransactions: any[] = [];
  try {
    const stored = localStorage.getItem('historical-transactions-v1');
    if (stored) historicalTransactions = JSON.parse(stored);
  } catch { /* noop */ }

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

// ---------- Importa dataset desde objeto ----------
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

// ---------- Limpia toda la base local ----------
export const clearAllData = async () => {
  await storage.clear();
};

/* ---------------------------------------------------------------
   NUEVO: Exportar Backup Manual (archivo .json)
---------------------------------------------------------------- */
export async function exportBackupManual(): Promise<void> {
  const data = await exportData();
  const content = JSON.stringify(data, null, 2);
  const filename = buildBackupFilename();

  if (isElectron && window.electronAPI?.saveBackup) {
    await window.electronAPI.saveBackup({ filename, content });
    return;
  }

  const blob = new Blob([content], { type: 'application/json' });

  if (fsAccessSupported && window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  // Fallback navegador: descarga directa
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------
   NUEVO: Importar Backup Manual (desde .json)
---------------------------------------------------------------- */
export async function importBackupManual(): Promise<void> {
  if (isElectron && window.electronAPI?.openBackup) {
    const text = await window.electronAPI.openBackup();
    if (text) {
      const json = JSON.parse(text);
      await importData(json);
    }
    return;
  }

  // Web con File System Access API
  if (typeof window.showOpenFilePicker === 'function') {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      multiple: false
    });
    const file = await handle.getFile();
    const text = await file.text();
    const json = JSON.parse(text);
    await importData(json);
    return;
  }

  // Fallback input oculto
  await new Promise<void>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return resolve();
      const text = await file.text();
      const json = JSON.parse(text);
      await importData(json);
      resolve();
    };
    input.click();
  });
}

/* ---------------------------------------------------------------
   NUEVO: Elegir carpeta para backups (devuelve string)
   - En Web guardamos un "alias" para mostrar; el permiso al folder
     real no es portable, así que el backup manual usa SavePicker.
   - En Electron, devolvemos la ruta real seleccionada.
---------------------------------------------------------------- */
export async function chooseBackupFolder(): Promise<string | null> {
  if (isElectron && window.electronAPI?.chooseBackupFolder) {
    const folder = await window.electronAPI.chooseBackupFolder();
    if (folder) {
      const cfg = getBackupConfig();
      setBackupConfig({ ...cfg, folder });
    }
    return folder;
  }

  if (typeof window.showDirectoryPicker === 'function') {
    try {
      const handle = await window.showDirectoryPicker();
      // No podemos persistir el handle de forma portable; guardamos un nombre simbólico
      const name = handle.name || 'Carpeta seleccionada';
      localStorage.setItem(BACKUP_WEB_FOLDER_KEY, name);
      const cfg = getBackupConfig();
      setBackupConfig({ ...cfg, folder: name });
      return name;
    } catch {
      return null;
    }
  }

  // Sin soporte
  const label = 'Descargas (por defecto)';
  localStorage.setItem(BACKUP_WEB_FOLDER_KEY, label);
  const cfg = getBackupConfig();
  setBackupConfig({ ...cfg, folder: label });
  return label;
}

/* ---------------------------------------------------------------
   NUEVO: Utilidades de ruta/nombre (para UI)
---------------------------------------------------------------- */
export async function getDataPath(): Promise<string> {
  if (isElectron && window.electronAPI?.getDataPath) {
    try {
      return await window.electronAPI.getDataPath();
    } catch {
      /* noop */
    }
  }
  return 'Navegador (IndexedDB/localStorage)';
}

export function getWebBackupFolderName(): string | null {
  return localStorage.getItem(BACKUP_WEB_FOLDER_KEY);
}

/* ---------------------------------------------------------------
   NUEVO: Configurar Auto-Backup (intervalo u hora fija)
   - Guarda config en localStorage
   - En Web: programa setInterval en esta pestaña
   - En Electron: delega al proceso principal si está disponible
---------------------------------------------------------------- */
export function configureAutoBackup(config: AutoBackupConfig): void {
  setBackupConfig(config);
  setupAutoBackupTimer();
  // En Electron, si existe un manejador del lado nativo
  if (isElectron && window.electronAPI?.setAutoBackup) {
    window.electronAPI.setAutoBackup({
      enabled: config.enabled,
      mode: config.mode,
      intervalMinutes: config.intervalMinutes,
      time: config.time,
      folder: config.folder ?? null
    }).catch(() => {/* noop */});
  }
}

/* ---------------------------------------------------------------
   Soporte interno para auto-backup en Web
---------------------------------------------------------------- */
function getBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { enabled: false, mode: 'interval', intervalMinutes: 60, time: '03:00', folder: null };
}

function setBackupConfig(cfg: AutoBackupConfig) {
  localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(cfg));
}

async function runBackupOnceSilently() {
  try {
    await exportBackupManual();
    // Podrías dejar un log suave si querés:
    // console.info('[AutoBackup] Backup realizado', new Date().toISOString());
  } catch (e) {
    console.warn('[AutoBackup] Error realizando backup:', e);
  }
}

function setupAutoBackupTimer() {
  const cfg = getBackupConfig();

  if (autoBackupIntervalId !== null) {
    window.clearInterval(autoBackupIntervalId);
    autoBackupIntervalId = null;
  }

  if (!cfg.enabled) return;

  if (cfg.mode === 'interval') {
    const minutes = Math.max(1, Number(cfg.intervalMinutes || 60));
    autoBackupIntervalId = window.setInterval(runBackupOnceSilently, minutes * 60 * 1000);
    // Ejecutamos uno inmediato al configurar
    runBackupOnceSilently();
  } else {
    // Modo por hora fija HH:mm – comprobamos cada minuto
    autoBackupIntervalId = window.setInterval(() => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      if ((cfg.time || '03:00') === `${hh}:${mm}`) {
        runBackupOnceSilently();
      }
    }, 60 * 1000);
  }
}

// Inicializa el timer al cargar el módulo (solo Web; en Electron el main puede manejarlo)
if (typeof window !== 'undefined') {
  setupAutoBackupTimer();
}
