// src/pages/CashRegister.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Download,
  Search,
  Minus,
  X,
  AlertTriangle,
  User,
  Clock,
  Receipt,
  Banknote,
  CreditCard,
  FileText,
  Package,
  Calendar,
  Plus,
  Eye,
  CheckCircle,
  History,
  Filter,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  FileSpreadsheet,
  Calculator,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { updateAdminTurn, addExpenseTransaction, getTurnClosures, addTurnClosure } from '../utils/db';
import TransactionDetailModal from '../components/TransactionDetailModal';

interface TurnTransaction {
  id: string;
  fecha: string;
  hora: string;
  tipo: 'kiosk' | 'court' | 'retiro' | 'gasto' | 'caja-inicial';
  recibo: string;
  withdrawalId?: string;
  cliente: string;
  lote: string;
  origen: string;
  total: number;
  metodo: 'efectivo' | 'transferencia' | 'expensa' | 'combinado';
  items?: any[];
  adminName?: string;
  notes?: string;
  paymentBreakdown?: {
    efectivo: number;
    transferencia: number;
    expensa: number;
  };
  createdAt: string;
}

type Totals = { general: number; efectivo: number; transferencia: number; expensa: number };

const CashRegister: React.FC = () => {
  const { sales, courtBills, activeTurn, setActiveTurn, refreshData } = useStore();

  // Arrays/valores seguros
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeCourtBills = Array.isArray(courtBills) ? courtBills : [];

  const [turnTransactions, setTurnTransactions] = useState<TurnTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TurnTransaction[]>([]);
  const [turnClosures, setTurnClosures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<'' | 'efectivo' | 'transferencia' | 'expensa' | 'combinado'>('');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TurnTransaction | null>(null);
  const [showClosuresHistory, setShowClosuresHistory] = useState(false);
  
  // Estados para filtros de cierres
  const [closuresSearchTerm, setClosuresSearchTerm] = useState('');
  const [closuresDateFilter, setClosuresDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [closuresCustomDateStart, setClosuresCustomDateStart] = useState('');
  const [closuresCustomDateEnd, setClosuresCustomDateEnd] = useState('');
  const [closuresAdminFilter, setClosuresAdminFilter] = useState('');
  const [closuresSortBy, setClosuresSortBy] = useState<'date' | 'admin' | 'total'>('date');
  const [closuresSortOrder, setClosuresSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showClosuresFilters, setShowClosuresFilters] = useState(false);

  // Estados para retiro
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  // Estados para gasto
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseDetail, setExpenseDetail] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);

  // Carga inicial de datos (segura)
  useEffect(() => {
    (async () => {
      try {
        await refreshData?.();
        await loadTurnClosures();
      } catch (e) {
        console.error('refreshData falló:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar transacciones del turno cuando haya turno o cambien los orígenes
  useEffect(() => {
    if (activeTurn?.startDate) {
      loadTurnTransactions();
    } else {
      setTurnTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurn?.id, activeTurn?.startDate, JSON.stringify(safeSales), JSON.stringify(safeCourtBills)]);

  // Aplicar filtros cuando cambien las transacciones o los filtros
  useEffect(() => {
    applyFilters();
  }, [turnTransactions, searchTerm, dateFilter, paymentFilter]);

  const getSafeDate = (d: any) => (d ? new Date(d) : new Date(0));

  const loadTurnClosures = async () => {
    try {
      const closures = await getTurnClosures();
      setTurnClosures(closures || []);
    } catch (error) {
      console.error('Error loading turn closures:', error);
      setTurnClosures([]);
    }
  };
  
  // Filtrar y ordenar cierres de turno
  const filteredAndSortedClosures = useMemo(() => {
    let filtered = [...turnClosures];
    
    // Filtro de búsqueda
    if (closuresSearchTerm) {
      const term = closuresSearchTerm.toLowerCase();
      filtered = filtered.filter(closure => 
        closure.adminName.toLowerCase().includes(term) ||
        closure.id.toLowerCase().includes(term)
      );
    }
    
    // Filtro por administrador
    if (closuresAdminFilter) {
      filtered = filtered.filter(closure => closure.adminName === closuresAdminFilter);
    }
    
    // Filtro de fecha
    if (closuresDateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (closuresDateFilter) {
        case 'today': {
          filtered = filtered.filter(closure => {
            const closureDate = new Date(closure.endDate);
            return closureDate >= today;
          });
          break;
        }
        case 'yesterday': {
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          filtered = filtered.filter(closure => {
            const closureDate = new Date(closure.endDate);
            return closureDate >= yesterday && closureDate < today;
          });
          break;
        }
        case 'week': {
          const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(closure => {
            const closureDate = new Date(closure.endDate);
            return closureDate >= weekStart;
          });
          break;
        }
        case 'month': {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          filtered = filtered.filter(closure => {
            const closureDate = new Date(closure.endDate);
            return closureDate >= monthStart;
          });
          break;
        }
        case 'custom': {
          if (closuresCustomDateStart && closuresCustomDateEnd) {
            const startDate = new Date(closuresCustomDateStart);
            const endDate = new Date(closuresCustomDateEnd + 'T23:59:59');
            filtered = filtered.filter(closure => {
              const closureDate = new Date(closure.endDate);
              return closureDate >= startDate && closureDate <= endDate;
            });
          }
          break;
        }
      }
    }
    
    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (closuresSortBy) {
        case 'date':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'admin':
          comparison = a.adminName.localeCompare(b.adminName);
          break;
        case 'total':
          comparison = a.totals.general - b.totals.general;
          break;
      }
      
      return closuresSortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [turnClosures, closuresSearchTerm, closuresAdminFilter, closuresDateFilter, closuresCustomDateStart, closuresCustomDateEnd, closuresSortBy, closuresSortOrder]);
  
  // Obtener lista única de administradores para el filtro
  const uniqueAdmins = useMemo(() => {
    const admins = turnClosures.map(closure => closure.adminName);
    return [...new Set(admins)].sort();
  }, [turnClosures]);
  
  // Exportar cierres filtrados a CSV
  const exportClosuresCSV = () => {
    if (filteredAndSortedClosures.length === 0) {
      alert('No hay cierres para exportar');
      return;
    }
    
    const headers = [
      'ID Cierre',
      'Administrador',
      'Fecha Inicio',
      'Fecha Fin',
      'Duración (horas)',
      'Cantidad Ventas',
      'Total Efectivo',
      'Total Transferencia',
      'Total Expensa',
      'Total General',
      'Promedio por Venta'
    ];
    
    const rows = filteredAndSortedClosures.map(closure => {
      const startDate = new Date(closure.startDate);
      const endDate = new Date(closure.endDate);
      const durationHours = ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)).toFixed(2);
      const averagePerSale = closure.salesCount > 0 ? (closure.totals.general / closure.salesCount).toFixed(2) : '0.00';
      
      return [
        closure.id.slice(-8), // Últimos 8 caracteres del ID
        closure.adminName,
        startDate.toLocaleDateString('es-ES') + ' ' + startDate.toLocaleTimeString('es-ES'),
        endDate.toLocaleDateString('es-ES') + ' ' + endDate.toLocaleTimeString('es-ES'),
        durationHours,
        closure.salesCount,
        closure.totals.efectivo.toFixed(2),
        closure.totals.transferencia.toFixed(2),
        closure.totals.expensa.toFixed(2),
        closure.totals.general.toFixed(2),
        averagePerSale
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cierres-turno-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Limpiar filtros de cierres
  const clearClosuresFilters = () => {
    setClosuresSearchTerm('');
    setClosuresDateFilter('all');
    setClosuresCustomDateStart('');
    setClosuresCustomDateEnd('');
    setClosuresAdminFilter('');
    setClosuresSortBy('date');
    setClosuresSortOrder('desc');
  };

  const loadTurnTransactions = () => {
    if (!activeTurn?.startDate) return;

    const turnStart = getSafeDate(activeTurn.startDate);
    const transactions: TurnTransaction[] = [];

    // Ventas del kiosco dentro del turno
    const turnSales = safeSales.filter((sale: any) => {
      const saleDate = getSafeDate(sale?.createdAt);
      return saleDate >= turnStart;
    });

    turnSales.forEach((sale: any) => {
      const saleDate = getSafeDate(sale?.createdAt);
      const tipo: TurnTransaction['tipo'] =
        (typeof sale?.total === 'number' && sale.total < 0) ? 'retiro'
          : (sale?.customerName?.includes?.('Caja Inicial') ? 'caja-inicial' : 'kiosk');

      const transaction: TurnTransaction = {
        id: String(sale?.id ?? `sale-${Math.random()}`),
        fecha: saleDate.toLocaleDateString('es-ES'),
        hora: saleDate.toLocaleTimeString('es-ES'),
        tipo,
        recibo: String(sale?.receiptNumber ?? ''),
        cliente: String(sale?.customerName ?? 'Cliente general'),
        lote: String(sale?.lotNumber ?? '0'),
        origen:
          (typeof sale?.total === 'number' && sale.total < 0)
            ? 'Retiro de Caja'
            : (sale?.customerName?.includes?.('Caja Inicial') ? 'Caja Inicial' : (sale?.courtId ?? 'Kiosco')),
        total: Number(sale?.total ?? 0),
        metodo: (sale?.paymentMethod ?? 'efectivo') as TurnTransaction['metodo'],
        items: Array.isArray(sale?.items) ? sale.items : [],
        paymentBreakdown: sale?.paymentBreakdown ?? undefined,
        createdAt: sale?.createdAt ?? new Date().toISOString(),
      };
      transactions.push(transaction);
    });

    // Facturas de canchas dentro del turno
    const turnCourtBills = safeCourtBills.filter((bill: any) => {
      const billDate = getSafeDate(bill?.createdAt);
      return billDate >= turnStart;
    });

    turnCourtBills.forEach((bill: any) => {
      const billDate = getSafeDate(bill?.createdAt);
      const transaction: TurnTransaction = {
        id: String(bill?.id ?? `bill-${Math.random()}`),
        fecha: billDate.toLocaleDateString('es-ES'),
        hora: billDate.toLocaleTimeString('es-ES'),
        tipo: 'court',
        recibo: String(bill?.receiptNumber ?? ''),
        cliente: String(bill?.customerName ?? 'Cliente'),
        lote: String(bill?.lotNumber ?? '0'),
        origen: String(bill?.courtName ?? 'Cancha'),
        total: Number(bill?.total ?? 0),
        metodo: (bill?.paymentMethod ?? 'efectivo') as TurnTransaction['metodo'],
        items: [
          ...(Array.isArray(bill?.kioskItems) ? bill.kioskItems : []),
          ...(Array.isArray(bill?.services) ? bill.services : []),
        ],
        paymentBreakdown: bill?.paymentBreakdown ?? undefined,
        createdAt: bill?.createdAt ?? new Date().toISOString(),
      };
      transactions.push(transaction);
    });

    // Retiros del turno
    if (Array.isArray(activeTurn?.transactions)) {
      activeTurn!.transactions.forEach((withdrawal: any) => {
        const withdrawalDate = getSafeDate(withdrawal?.createdAt);
        const transaction: TurnTransaction = {
          id: String(withdrawal?.id ?? `withdraw-${Math.random()}`),
          fecha: withdrawalDate.toLocaleDateString('es-ES'),
          hora: withdrawalDate.toLocaleTimeString('es-ES'),
          tipo: 'retiro',
          recibo: String(withdrawal?.receiptNumber ?? ''),
          withdrawalId: withdrawal?.withdrawalId,
          cliente: `Retiro - ${String(withdrawal?.adminName ?? 'Admin')}`,
          lote: '0',
          origen: 'Retiro de Caja',
          total: -Math.abs(Number(withdrawal?.amount ?? 0)),
          metodo: 'efectivo',
          items: [],
          adminName: withdrawal?.adminName,
          notes: withdrawal?.notes,
          createdAt: withdrawal?.createdAt ?? new Date().toISOString(),
        };
        transactions.push(transaction);
      });
    }

    // Gastos del turno
    if (Array.isArray(activeTurn?.expenses)) {
      activeTurn!.expenses.forEach((expense: any) => {
        const expenseDate = getSafeDate(expense?.createdAt);
        const transaction: TurnTransaction = {
          id: String(expense?.id ?? `expense-${Math.random()}`),
          fecha: expenseDate.toLocaleDateString('es-ES'),
          hora: expenseDate.toLocaleTimeString('es-ES'),
          tipo: 'gasto',
          recibo: String(expense?.receiptNumber ?? ''),
          cliente: `Gasto - ${String(expense?.adminName ?? 'Admin')}`,
          lote: '0',
          origen: String(expense?.concept ?? 'Gasto'),
          total: -Math.abs(Number(expense?.amount ?? 0)),
          metodo: 'efectivo',
          items: [],
          adminName: expense?.adminName,
          notes: expense?.detail,
          createdAt: expense?.createdAt ?? new Date().toISOString(),
        };
        transactions.push(transaction);
      });
    }

    // Ordenar por fecha descendente
    transactions.sort(
      (a, b) => getSafeDate(b.createdAt).getTime() - getSafeDate(a.createdAt).getTime()
    );
    setTurnTransactions(transactions);
  };

  const applyFilters = () => {
    let filtered = Array.isArray(turnTransactions) ? [...turnTransactions] : [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((t) => {
        const cliente = (t.cliente ?? '').toLowerCase();
        const recibo = (t.recibo ?? '').toLowerCase();
        const origen = (t.origen ?? '').toLowerCase();
        const lote = (t.lote ?? '').toLowerCase();
        return (
          cliente.includes(term) ||
          recibo.includes(term) ||
          origen.includes(term) ||
          lote.includes(term)
        );
      });
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === 'today') {
        filtered = filtered.filter((t) => getSafeDate(t.createdAt) >= today);
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        filtered = filtered.filter((t) => {
          const d = getSafeDate(t.createdAt);
          return d >= yesterday && d < today;
        });
      }
    }

    if (paymentFilter) {
      filtered = filtered.filter((t) => t.metodo === paymentFilter);
    }

    setFilteredTransactions(filtered);
  };

  // Calcular totales reales basados en las transacciones cargadas
  const calculateRealTotals = useCallback((): Totals => {
    return (Array.isArray(turnTransactions) ? turnTransactions : []).reduce<Totals>(
      (totals, transaction) => {
        const total = Number(transaction.total || 0);
        totals.general += total;

        if (transaction.metodo === 'combinado' && transaction.paymentBreakdown) {
          totals.efectivo += Number(transaction.paymentBreakdown.efectivo || 0);
          totals.transferencia += Number(transaction.paymentBreakdown.transferencia || 0);
          totals.expensa += Number(transaction.paymentBreakdown.expensa || 0);
        } else {
          if (transaction.metodo === 'efectivo') totals.efectivo += total;
          if (transaction.metodo === 'transferencia') totals.transferencia += total;
          if (transaction.metodo === 'expensa') totals.expensa += total;
        }
        return totals;
      },
      { general: 0, efectivo: 0, transferencia: 0, expensa: 0 }
    );
  }, [turnTransactions]);

  const realTotals = useMemo(() => calculateRealTotals(), [calculateRealTotals]);

  const handleWithdrawal = async () => {
    if (!activeTurn || withdrawalAmount <= 0) {
      alert('Debe ingresar un monto válido para el retiro');
      return;
    }

    if (withdrawalAmount > realTotals.efectivo) {
      alert(`No hay suficiente efectivo en caja. Disponible: $${realTotals.efectivo.toFixed(2)}`);
      return;
    }

    if (!withdrawalNotes.trim()) {
      alert('Debe ingresar el motivo del retiro');
      return;
    }

    try {
      // Crear la transacción de retiro
      const withdrawal = await addExpenseTransaction({
        type: 'retiro',
        amount: withdrawalAmount,
        adminName: activeTurn.adminName,
        notes: withdrawalNotes.trim(),
        paymentMethod: 'efectivo',
      });

      // Actualizar el turno con la nueva transacción
      const updatedTransactions = [...((activeTurn as any)?.transactions ?? []), withdrawal];
      
      // Calcular nuevos totales descontando el retiro
      const newTotals = {
        efectivo: realTotals.efectivo - withdrawalAmount,
        transferencia: realTotals.transferencia,
        expensa: realTotals.expensa,
        total: realTotals.general - withdrawalAmount,
      };

      const updatedTurn = await updateAdminTurn(activeTurn.id, {
        transactions: updatedTransactions,
        totals: newTotals,
      });

      if (updatedTurn) {
        setActiveTurn(updatedTurn);
      }

      // Limpiar formulario
      setWithdrawalAmount(0);
      setWithdrawalNotes('');
      setShowWithdrawalModal(false);
      
      // Refrescar datos
      await refreshData?.();
      
      alert(`Retiro de $${withdrawalAmount} registrado exitosamente`);
    } catch (error) {
      console.error('Error al procesar retiro:', error);
      alert('Error al procesar el retiro');
    }
  };

  const handleCloseTurn = async () => {
    if (!activeTurn) return;

    if (!window.confirm('¿Está seguro de que desea cerrar el turno? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Crear el cierre de turno
      const turnClosure = {
        turnId: activeTurn.id,
        adminName: activeTurn.adminName,
        startDate: activeTurn.startDate,
        endDate: new Date().toISOString(),
        sales: turnTransactions.filter(t => t.tipo === 'kiosk' || t.tipo === 'court'),
        transactions: activeTurn.transactions || [],
        expenses: activeTurn.expenses || [],
        totals: realTotals,
        salesCount: turnTransactions.filter(t => t.tipo === 'kiosk' || t.tipo === 'court').length,
      };

      await addTurnClosure(turnClosure);

      // Cerrar el turno activo
      const updatedTurn = await updateAdminTurn(activeTurn.id, {
        status: 'closed',
        endDate: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        totals: realTotals,
      });

      if (updatedTurn) {
        setActiveTurn(null);
        alert('Turno cerrado exitosamente');
      }

      await refreshData?.();
      await loadTurnClosures();
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      alert('Error al cerrar el turno');
    }
  };

  const exportTransactionsCSV = () => {
    const list = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    if (list.length === 0) {
      alert('No hay transacciones para exportar');
      return;
    }

    const headers = [
      'Fecha',
      'Hora',
      'Tipo',
      'Recibo',
      'Cliente',
      'Lote',
      'Origen',
      'Item',
      'Cantidad',
      'Precio Unitario',
      'Subtotal Item',
      'Total Transacción',
      'Método',
      'Efectivo',
      'Transferencia',
      'Expensa',
      'Notas',
    ];

    const rows: string[][] = [];

    list.forEach((transaction) => {
      const baseTransactionData = [
        transaction.fecha,
        transaction.hora,
        getTypeLabel(transaction.tipo),
        transaction.recibo,
        transaction.cliente,
        transaction.lote,
        transaction.origen,
      ];

      const paymentMethodText =
        transaction.metodo === 'combinado'
          ? (() => {
              const methods: string[] = [];
              if ((transaction.paymentBreakdown?.efectivo ?? 0) > 0) methods.push('Efectivo');
              if ((transaction.paymentBreakdown?.transferencia ?? 0) > 0) methods.push('Transferencia');
              if ((transaction.paymentBreakdown?.expensa ?? 0) > 0) methods.push('Expensa');
              return methods.join(' + ');
            })()
          : transaction.metodo;

      // Calcular montos por método de pago
      let efectivoAmount = 0;
      let transferenciaAmount = 0;
      let expensaAmount = 0;

      if (transaction.paymentBreakdown) {
        efectivoAmount = Number(transaction.paymentBreakdown.efectivo || 0);
        transferenciaAmount = Number(transaction.paymentBreakdown.transferencia || 0);
        expensaAmount = Number(transaction.paymentBreakdown.expensa || 0);
      } else {
        if (transaction.metodo === 'efectivo') efectivoAmount = Number(transaction.total || 0);
        if (transaction.metodo === 'transferencia') transferenciaAmount = Number(transaction.total || 0);
        if (transaction.metodo === 'expensa') expensaAmount = Number(transaction.total || 0);
      }

      const items = Array.isArray(transaction.items) ? transaction.items : [];

      if (items.length > 0) {
        items.forEach((item: any, itemIndex: number) => {
          const itemName = item?.product?.name || item?.service?.name || item?.nombre || 'Item desconocido';
          const itemQuantity = Number(item?.quantity ?? item?.cantidad ?? 1);
          const itemPrice = Number(item?.product?.price ?? item?.service?.price ?? item?.precio ?? 0);
          const itemSubtotal = Number(item?.subtotal ?? itemPrice * itemQuantity);
          const isFirstItem = itemIndex === 0;

          rows.push([
            ...baseTransactionData,
            String(itemName),
            String(itemQuantity),
            String(itemPrice),
            String(itemSubtotal),
            isFirstItem ? String(transaction.total) : '',
            isFirstItem ? paymentMethodText : '',
            isFirstItem ? String(efectivoAmount) : '',
            isFirstItem ? String(transferenciaAmount) : '',
            isFirstItem ? String(expensaAmount) : '',
            isFirstItem ? String(transaction.notes ?? '') : '',
          ]);
        });
      } else {
        rows.push([
          ...baseTransactionData,
          'Sin items detallados',
          '1',
          String(transaction.total),
          String(transaction.total),
          String(transaction.total),
          paymentMethodText,
          String(efectivoAmount),
          String(transferenciaAmount),
          String(expensaAmount),
          String(transaction.notes ?? ''),
        ]);
      }
    });

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `arqueo-caja-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const prepareTransactionForModal = (transaction: TurnTransaction) => {
    const items = (Array.isArray(transaction.items) ? transaction.items : []).map((item) => ({
      id: item?.id || `item-${Date.now()}-${Math.random()}`,
      nombre: item?.product?.name || item?.service?.name || item?.nombre || 'Item desconocido',
      cantidad: Number(item?.quantity ?? item?.cantidad ?? 1),
      precioUnitario: Number(item?.product?.price ?? item?.service?.price ?? item?.precio ?? 0),
      subtotal: Number(item?.subtotal ?? 0),
      descuento: Number(item?.descuento ?? 0),
      categoria: item?.product?.category || item?.service?.category || item?.categoria || 'Sin categoría',
    }));

    return { ...transaction, items };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'kiosk':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'court':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'retiro':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'gasto':
        return <Minus className="h-4 w-4 text-orange-600" />;
      case 'caja-inicial':
        return <Plus className="h-4 w-4 text-yellow-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'kiosk':
        return 'Kiosco';
      case 'court':
        return 'Cancha';
      case 'retiro':
        return 'Retiro';
      case 'gasto':
        return 'Gasto';
      case 'caja-inicial':
        return 'Caja Inicial';
      default:
        return 'Otro';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'kiosk':
        return 'bg-green-100 text-green-800';
      case 'court':
        return 'bg-blue-100 text-blue-800';
      case 'retiro':
        return 'bg-red-100 text-red-800';
      case 'gasto':
        return 'bg-orange-100 text-orange-800';
      case 'caja-inicial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Banknote className="h-4 w-4 text-green-600" />;
      case 'transferencia':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'expensa':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'combinado':
        return (
          <div className="flex space-x-1">
            <Banknote className="h-3 w-3 text-green-600" />
            <CreditCard className="h-3 w-3 text-blue-600" />
            <FileText className="h-3 w-3 text-purple-600" />
          </div>
        );
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!activeTurn) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Arqueo de Caja</h1>
            <p className="mt-2 text-sm text-gray-700">Control de ingresos y gestión de turnos administrativos</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => setShowClosuresHistory(true)}
              className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100"
            >
              <History className="h-4 w-4 mr-2" />
              Ver Cierres Anteriores
            </button>
          </div>
        </div>

        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-yellow-100 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay turno activo</h2>
            <p className="text-gray-600 mb-6">
              No se puede realizar el arqueo de caja porque no hay un turno administrativo activo.
            </p>
            <button
              onClick={() => setShowClosuresHistory(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ver Cierres de Turnos Anteriores
            </button>
          </div>
        </div>

        {/* Modal de historial de cierres */}
        {showClosuresHistory && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowClosuresHistory(false)} />
            
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl bg-white rounded-lg shadow-xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center">
                  <History className="h-5 w-5 mr-2 text-blue-600" />
                  Historial de Cierres de Turno ({filteredAndSortedClosures.length})
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportClosuresCSV}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => setShowClosuresHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Filtros de cierres */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Filter className="h-5 w-5 mr-2 text-gray-600" />
                      Filtros y Ordenamiento
                    </h3>
                    <button
                      onClick={() => setShowClosuresFilters(!showClosuresFilters)}
                      className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      {showClosuresFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {showClosuresFilters ? 'Ocultar' : 'Mostrar'} Filtros
                    </button>
                  </div>
                  
                  {showClosuresFilters && (
                    <div className="space-y-4">
                      {/* Primera fila de filtros */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Buscar por admin o ID..."
                            value={closuresSearchTerm}
                            onChange={(e) => setClosuresSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        
                        <select
                          value={closuresDateFilter}
                          onChange={(e) => setClosuresDateFilter(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Todas las fechas</option>
                          <option value="today">Hoy</option>
                          <option value="yesterday">Ayer</option>
                          <option value="week">Última semana</option>
                          <option value="month">Último mes</option>
                          <option value="custom">Personalizado</option>
                        </select>
                        
                        <select
                          value={closuresAdminFilter}
                          onChange={(e) => setClosuresAdminFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Todos los admins</option>
                          {uniqueAdmins.map(admin => (
                            <option key={admin} value={admin}>{admin}</option>
                          ))}
                        </select>
                        
                        <div className="flex space-x-2">
                          <select
                            value={closuresSortBy}
                            onChange={(e) => setClosuresSortBy(e.target.value as any)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="date">Ordenar por fecha</option>
                            <option value="admin">Ordenar por admin</option>
                            <option value="total">Ordenar por total</option>
                          </select>
                          <button
                            onClick={() => setClosuresSortOrder(closuresSortOrder === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            title={`Cambiar a orden ${closuresSortOrder === 'asc' ? 'descendente' : 'ascendente'}`}
                          >
                            {closuresSortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Filtros de fecha personalizada */}
                      {closuresDateFilter === 'custom' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de Inicio
                            </label>
                            <input
                              type="date"
                              value={closuresCustomDateStart}
                              onChange={(e) => setClosuresCustomDateStart(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de Fin
                            </label>
                            <input
                              type="date"
                              value={closuresCustomDateEnd}
                              onChange={(e) => setClosuresCustomDateEnd(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Botones de acción */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={clearClosuresFilters}
                            className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Limpiar Filtros
                          </button>
                          <div className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            {filteredAndSortedClosures.length} de {turnClosures.length} cierres
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            Total filtrado: ${filteredAndSortedClosures.reduce((sum, c) => sum + c.totals.general, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Lista de cierres */}
                {turnClosures.length > 0 ? (
                  <div className="space-y-3">
                    {filteredAndSortedClosures.map((closure) => {
                      const startDate = new Date(closure.startDate);
                      const endDate = new Date(closure.endDate);
                      const durationHours = ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)).toFixed(1);
                      const averagePerSale = closure.salesCount > 0 ? (closure.totals.general / closure.salesCount).toFixed(2) : '0.00';
                      
                      return (
                        <div key={closure.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                          {/* Header del cierre */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <User className="h-5 w-5 text-blue-600 mr-2" />
                                <div>
                                  <p className="text-lg font-bold text-gray-900">{closure.adminName}</p>
                                  <p className="text-xs text-gray-500 font-mono">ID: {closure.id.slice(-8)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">${closure.totals.general.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{closure.salesCount} ventas</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Información del período */}
                          <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                  <Clock className="h-4 w-4 text-blue-600 mr-2" />
                                  <span className="text-sm font-medium text-blue-800">Período del Turno</span>
                                </div>
                                <div className="space-y-1 text-sm text-blue-700">
                                  <div><strong>Inicio:</strong> {startDate.toLocaleDateString('es-ES')} {startDate.toLocaleTimeString('es-ES')}</div>
                                  <div><strong>Fin:</strong> {endDate.toLocaleDateString('es-ES')} {endDate.toLocaleTimeString('es-ES')}</div>
                                  <div><strong>Duración:</strong> {durationHours} horas</div>
                                </div>
                              </div>
                              
                              <div className="bg-green-50 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                  <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                                  <span className="text-sm font-medium text-green-800">Estadísticas</span>
                                </div>
                                <div className="space-y-1 text-sm text-green-700">
                                  <div><strong>Ventas:</strong> {closure.salesCount}</div>
                                  <div><strong>Promedio/venta:</strong> ${averagePerSale}</div>
                                  <div><strong>Ventas/hora:</strong> {durationHours > 0 ? (closure.salesCount / parseFloat(durationHours)).toFixed(1) : '0'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Totales por método de pago */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Banknote className="h-4 w-4 text-green-600 mr-2" />
                                  <span className="text-sm font-medium text-green-800">Efectivo</span>
                                </div>
                                <span className="text-lg font-bold text-green-900">${closure.totals.efectivo.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
                                  <span className="text-sm font-medium text-blue-800">Transferencia</span>
                                </div>
                                <span className="text-lg font-bold text-blue-900">${closure.totals.transferencia.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <FileText className="h-4 w-4 text-purple-600 mr-2" />
                                  <span className="text-sm font-medium text-purple-800">Expensa</span>
                                </div>
                                <span className="text-lg font-bold text-purple-900">${closure.totals.expensa.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Receipt className="h-4 w-4 text-gray-600 mr-2" />
                                  <span className="text-sm font-medium text-gray-800">Total</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900">${closure.totals.general.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Resumen de totales filtrados */}
                    {filteredAndSortedClosures.length > 1 && (
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border-2 border-blue-200 mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                          Resumen de Cierres Filtrados
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Cierres</p>
                            <p className="text-xl font-bold text-blue-600">{filteredAndSortedClosures.length}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Total Efectivo</p>
                            <p className="text-xl font-bold text-green-600">
                              ${filteredAndSortedClosures.reduce((sum, c) => sum + c.totals.efectivo, 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Total Transferencia</p>
                            <p className="text-xl font-bold text-blue-600">
                              ${filteredAndSortedClosures.reduce((sum, c) => sum + c.totals.transferencia, 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Total Expensa</p>
                            <p className="text-xl font-bold text-purple-600">
                              ${filteredAndSortedClosures.reduce((sum, c) => sum + c.totals.expensa, 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Total General</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${filteredAndSortedClosures.reduce((sum, c) => sum + c.totals.general, 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cierres registrados</h3>
                    <p className="text-gray-500">Los cierres de turno aparecerán aquí una vez que se registren.</p>
                  </div>
                )}
                
                {/* Mensaje cuando no hay resultados filtrados */}
                {turnClosures.length > 0 && filteredAndSortedClosures.length === 0 && (
                  <div className="text-center py-12">
                    <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cierres</h3>
                    <p className="text-gray-500 mb-4">No hay cierres que coincidan con los filtros aplicados.</p>
                    <button
                      onClick={clearClosuresFilters}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Arqueo de Caja</h1>
          <p className="mt-2 text-sm text-gray-700">Control de ingresos y gestión de turnos administrativos</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => setShowClosuresHistory(true)}
            className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100"
          >
            <History className="h-4 w-4 mr-2" />
            Cierres Anteriores
          </button>
          <button
            onClick={exportTransactionsCSV}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm hover:bg-orange-100"
          >
            <Minus className="h-4 w-4 mr-2" />
            Retiro de Dinero
          </button>
          <button
            onClick={handleCloseTurn}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar Turno
          </button>
        </div>
      </div>

      {/* Info del turno */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">Turno Activo</p>
              <p className="text-lg font-bold text-green-900">{activeTurn.adminName}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <div className="text-right">
              <p className="text-sm font-medium text-green-800">Inicio</p>
              <p className="text-sm text-green-700">{new Date(activeTurn.startDate).toLocaleString('es-ES')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-green-800">Transacciones</p>
            <p className="text-xl font-bold text-green-900">{turnTransactions.length}</p>
          </div>
        </div>
      </div>

      {/* Totales reales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total General</p>
              <p className="text-2xl font-bold text-gray-900">${realTotals.general.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Banknote className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Efectivo</p>
              <p className="text-2xl font-bold text-gray-900">${realTotals.efectivo.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transferencia</p>
              <p className="text-2xl font-bold text-gray-900">${realTotals.transferencia.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expensa</p>
              <p className="text-2xl font-bold text-gray-900">${realTotals.expensa.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente o cancha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="expensa">Expensa</option>
            <option value="combinado">Combinado</option>
          </select>

          <div className="flex items-center justify-center">
            <Receipt className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">{filteredTransactions.length} resultados</span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Transacciones del Turno ({filteredTransactions.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recibo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalle/Notas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{transaction.fecha}</div>
                      <div className="text-gray-500">{transaction.hora}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                        transaction.tipo
                      )}`}
                    >
                      {getTypeIcon(transaction.tipo)}
                      <span className="ml-1">{getTypeLabel(transaction.tipo)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.recibo}
                    {transaction.withdrawalId && (
                      <div className="text-xs text-red-600 font-mono">{transaction.withdrawalId}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div>{transaction.cliente}</div>
                        {transaction.lote !== '0' && (
                          <div className="text-xs text-gray-500">Lote: {transaction.lote}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.origen}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {transaction.notes ? (
                      <div className="truncate" title={transaction.notes}>
                        {transaction.notes}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.total < 0 ? 'text-red-600' : 'text-green-600'}>
                      ${transaction.total.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      {getPaymentIcon(transaction.metodo)}
                      <span className="ml-2 capitalize">
                        {transaction.metodo === 'combinado'
                          ? (() => {
                              const methods: string[] = [];
                              if ((transaction.paymentBreakdown?.efectivo ?? 0) > 0) methods.push('Efectivo');
                              if ((transaction.paymentBreakdown?.transferencia ?? 0) > 0) methods.push('Transferencia');
                              if ((transaction.paymentBreakdown?.expensa ?? 0) > 0) methods.push('Expensa');
                              return methods.join(' + ');
                            })()
                          : transaction.metodo}
                      </span>
                    </div>
                    {transaction.paymentBreakdown && (
                      <div className="text-xs text-gray-500 mt-1">
                        {(transaction.paymentBreakdown.efectivo ?? 0) > 0 && (
                          <div>💵 ${transaction.paymentBreakdown.efectivo}</div>
                        )}
                        {(transaction.paymentBreakdown.transferencia ?? 0) > 0 && (
                          <div>💳 ${transaction.paymentBreakdown.transferencia}</div>
                        )}
                        {(transaction.paymentBreakdown.expensa ?? 0) > 0 && (
                          <div>📄 ${transaction.paymentBreakdown.expensa}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => {
                        setSelectedTransaction(prepareTransactionForModal(transaction));
                        setShowTransactionDetail(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      title="Ver detalle completo"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay transacciones en el turno actual</p>
          </div>
        )}
      </div>

      {/* Modal de retiro de dinero */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowWithdrawalModal(false)} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <Minus className="h-5 w-5 mr-2 text-red-600" />
                Retiro de Dinero
              </h2>
              <button onClick={() => setShowWithdrawalModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Efectivo disponible: ${realTotals.efectivo.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto a retirar *</label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                  min={0}
                  max={realTotals.efectivo}
                  step="0.01"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo del retiro *</label>
                <textarea
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Describe el motivo del retiro..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdrawal}
                  disabled={withdrawalAmount <= 0 || withdrawalAmount > realTotals.efectivo || !withdrawalNotes.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirmar Retiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de historial de cierres */}
      {showClosuresHistory && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowClosuresHistory(false)} />
          
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600" />
                Historial de Cierres de Turno
              </h2>
              <button
                onClick={() => setShowClosuresHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {turnClosures.length > 0 ? (
                <div className="space-y-4">
                  {turnClosures.map((closure) => (
                    <div key={closure.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Administrador</p>
                          <p className="text-lg font-bold text-gray-900">{closure.adminName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Período</p>
                          <p className="text-sm text-gray-600">
                            {new Date(closure.startDate).toLocaleDateString('es-ES')} - {new Date(closure.endDate).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Efectivo</p>
                          <p className="text-lg font-bold text-green-600">${closure.totals.efectivo.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Transferencias</p>
                          <p className="text-lg font-bold text-blue-600">${closure.totals.transferencia.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Expensas</p>
                          <p className="text-lg font-bold text-purple-600">${closure.totals.expensa.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Ventas</p>
                          <p className="text-lg font-bold text-gray-900">{closure.salesCount}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total General</p>
                          <p className="text-xl font-bold text-green-600">${closure.totals.general.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cierres registrados</h3>
                  <p className="text-gray-500">Los cierres de turno aparecerán aquí una vez que se registren.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de transacción */}
      <TransactionDetailModal
        isOpen={showTransactionDetail}
        onClose={() => setShowTransactionDetail(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default CashRegister;