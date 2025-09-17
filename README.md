# 🛒 Kiosco Digital - Sistema de Gestión Simplificado

Sistema completo de gestión para kiosco con control de inventario, desarrollado en React + TypeScript con persistencia local.

## 📋 Descripción General

**Kiosco Digital** es una aplicación web progresiva (PWA) diseñada para la gestión integral de un kiosco que incluye:
- 🛒 **Sistema de ventas** completo con carrito inteligente
- 📦 **Control de inventario** con sistema de semáforo
- 📊 **Dashboard ejecutivo** con analytics avanzados
- ⏰ **Gestión de turnos** administrativos
- 💼 **Arqueo de caja** y reportes financieros

## 🎯 Estado del Proyecto

| Categoría | Completado | Porcentaje |
|-----------|------------|------------|
| ✅ **Funcionalidades Core** | 100% | **100%** |

### **🚀 Funcionalidades Principales**
- ✅ Sistema de ventas completo con carrito
- ✅ Control de inventario con alertas automáticas
- ✅ Dashboard ejecutivo con KPIs y proyecciones
- ✅ Historial completo de transacciones
- ✅ Arqueo de caja y cierre de turnos
- ✅ Pagos combinados (efectivo + transferencia + expensa)

## 🚀 Tecnologías Utilizadas

### **Frontend & Core**
- **React 18** - Framework principal
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **Lucide React** - Iconografía moderna
- **React Router DOM** - Navegación SPA

### **Estado y Persistencia**
- **Zustand** - Gestión de estado global
- **IndexedDB** - Base de datos cliente principal
- **localStorage** - Fallback automático
- **idb-keyval** - Wrapper para IndexedDB

### **Reportes y Exportación**
- **CSV Export** - Exportación de datos
- **jsPDF** - Generación de PDFs
- **jsPDF-autotable** - Tablas en PDF

### **PWA y Offline**
- **Vite PWA Plugin** - Service Worker
- **Workbox** - Estrategias de cache
- **Funcionamiento offline** completo

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    KIOSCO DIGITAL                           │
├─────────────────────────────────────────────────────────────┤
│  🔐 AUTENTICACIÓN                                           │
│  ├── Usuario Clásico (Ventas, Turno)                       │
│  └── Administrador (Acceso completo + Dashboard)           │
├─────────────────────────────────────────────────────────────┤
│  📱 MÓDULOS PRINCIPALES                                     │
│  ├── 🛒 Sistema de Ventas (Kiosco)                         │
│  ├── 📦 Control de Inventario (Semáforo de Stock)          │
│  ├── ⏰ Gestión de Turnos Administrativos                   │
│  ├── 📊 Dashboard Ejecutivo (KPIs + Analytics)             │
│  ├── 🧾 Historial de Transacciones                         │
│  └── 💼 Arqueo de Caja                                     │
├─────────────────────────────────────────────────────────────┤
│  💾 PERSISTENCIA LOCAL                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Funcionalidades Detalladas

### 🛒 **Sistema de Ventas (Kiosco)**
- **Catálogo dinámico** con categorías (Bebidas, Snacks, Deportes)
- **Carrito inteligente** con control de stock en tiempo real
- **Métodos de pago**: Efectivo, Transferencia, Expensa, **Combinado**
- **Recibos automáticos** (formato: `KD-YYYY-NNNNNN`)
- **Datos de cliente** opcionales (nombre, lote)
- **Sonidos de confirmación** para mejor UX
- **Edición de precios** en tiempo real

### 📦 **Control de Inventario Inteligente**
**Sistema de semáforo automático:**
- 🟢 **Stock Alto**: > mínimo × 2
- 🟡 **Stock Medio**: entre mínimo y mínimo × 2
- 🔴 **Stock Bajo**: < stock mínimo
- ⚫ **Sin Stock**: = 0

**Movimientos automáticos:**
- ➕ **Entrada**: Reposición manual
- ➖ **Salida**: Retiro manual
- 🛒 **Venta**: Automático desde ventas
- 💔 **Merma**: Pérdidas/roturas

**Visualización:**
- 📊 **Gráfico de barras** por producto
- 🚨 **Alertas visuales** para stock crítico
- 📈 **Estadísticas** por nivel de stock

### ⏰ **Gestión de Turnos Administrativos**
- 👤 **Control por administrativo** con nombre
- 💰 **Caja inicial** configurable
- 📊 **Seguimiento en tiempo real**:
  - Total por método de pago (efectivo, transferencia, expensa)
  - Cantidad de transacciones
  - Tiempo de turno activo
- 🔒 **Validación obligatoria** para realizar ventas
- 📋 **Cierre con arqueo** completo

### 📊 **Dashboard Ejecutivo (Solo Admin)**
**KPIs principales:**
- 💰 Ingresos totales
- 🧾 Número de transacciones
- 🎯 Ticket promedio
- ⚠️ Alertas de stock bajo

**Analytics avanzados:**
- 🏆 **Productos más vendidos** (ranking top 5)
- 🥧 **Ventas por categoría** con porcentajes
- 📈 **Proyecciones** semanales y mensuales
- 📊 **Análisis de tendencias** (crecimiento/decrecimiento)

**Filtros temporales:**
- Hoy, Última semana, Último mes, Rango personalizado

### 🧾 **Historial de Transacciones**
- 📜 **Registro completo** de todas las operaciones
- 🔍 **Filtros avanzados**: Fecha, tipo, método de pago, cliente
- 🔎 **Búsqueda**: Por cliente, recibo, lote
- 📤 **Exportación**: CSV detallado y completo
- 👁️ **Vista detallada** por transacción con items
- 🏷️ **Categorización**: Kiosco, Retiros, Gastos, Caja inicial

## 🔐 Sistema de Autenticación

### **👤 Usuario Clásico** (Sin contraseña)
- ✅ Ventas (Kiosco)
- ✅ Turno Actual

### **🔑 Administrador** (Contraseña: `2580`)
- ✅ **Todo lo anterior +**
- ✅ Dashboard Ejecutivo
- ✅ Gestión de Productos
- ✅ Control de Stock
- ✅ Movimientos de Inventario
- ✅ Arqueo de Caja
- ✅ Historial de Transacciones

## 💳 Métodos de Pago Avanzados

### **Pagos Simples**
- 💵 **Efectivo**
- 💳 **Transferencia**
- 📄 **Expensa**

### **Pagos Combinados**
- 🔄 Permite dividir el pago entre múltiples métodos
- ✅ Validación automática de montos
- 📊 Desglose detallado en recibos y reportes

## 🗄️ Arquitectura de Datos

### **💾 Persistencia Local**
```
┌─────────────────┐
│   DISPOSITIVO   │
│                 │
│ IndexedDB       │
│ localStorage    │
│ (Funcionamiento │
│  Principal)     │
└─────────────────┘
```

## 📁 Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
│   ├── AdminLogin.tsx   # Modal de login administrativo
│   ├── Cart.tsx         # Carrito de compras avanzado
│   ├── ErrorBoundary.tsx# Manejo de errores
│   ├── Layout.tsx       # Layout principal
│   ├── ProductCard.tsx  # Tarjeta de producto
│   ├── ProductDialog.tsx# Formulario de productos
│   ├── ReceiptModal.tsx # Modal de recibo
│   └── TransactionDetailModal.tsx # Detalle de transacciones
├── pages/               # Páginas principales
│   ├── Sales.tsx        # Sistema de ventas
│   ├── Dashboard.tsx    # Analytics ejecutivos
│   ├── Products.tsx     # Gestión de productos
│   ├── Stock.tsx        # Control de inventario
│   ├── Movements.tsx    # Movimientos de stock
│   ├── CurrentTurn.tsx  # Turno actual
│   ├── Transactions.tsx # Historial completo
│   └── CashRegister.tsx # Arqueo de caja
├── store/               # Estado global
│   └── useStore.ts      # Store principal con Zustand
├── types/               # Definiciones TypeScript
│   └── index.ts         # Tipos principales
├── utils/               # Utilidades
│   └── db.ts           # Base de datos local
└── App.tsx             # Componente raíz
```

## 🗄️ Modelo de Datos

### **Entidades Principales**

```typescript
// Producto del kiosco
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock?: number;
  createdAt: string;
  updatedAt: string;
}

// Venta realizada
interface Sale {
  id: string;
  receiptNumber: string;  // KD-YYYY-NNNNNN
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

// Turno administrativo
interface AdminTurn {
  id: string;
  adminName: string;
  startDate: string;
  status: 'active' | 'closed';
  sales: Sale[];
  transactions?: WithdrawalTransaction[];
  totals: {
    efectivo: number;
    transferencia: number;
    expensa: number;
    total: number;
  };
}
```

## 📊 Sistema de Reportes y Analytics

### **📤 Exportaciones Disponibles**

#### 🧾 **Transacciones**
- **Resumen**: CSV con totales por método de pago
- **Completo**: CSV con detalle de items por transacción
- **Filtros**: Fecha, tipo, método de pago, cliente

#### 📦 **Inventario**
- **Productos**: JSON backup completo del sistema
- **Stock**: CSV con niveles actuales y alertas
- **Movimientos**: Historial completo de cambios

#### ⏰ **Turnos**
- **Resumen imprimible**: HTML optimizado para impresión
- **Detalle**: CSV con todas las transacciones del turno
- **Arqueo**: PDF con conciliación de caja

## 🚀 Instalación y Configuración

### **Requisitos Previos**
- Node.js 18+
- npm o yarn

### **Instalación Rápida**
```bash
# Clonar el repositorio
git clone [repository-url]
cd kiosco-digital

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
```

### **🔧 Configuración PWA**
La aplicación se instala automáticamente como PWA:
- **Nombre**: Kiosco Digital
- **Tema**: Verde corporativo (#16a34a)
- **Modo**: Standalone (app nativa)
- **Cache**: Automático con Workbox
- **Offline**: Funcionamiento completo sin internet

## 🔧 Configuración Inicial del Sistema

### **📦 Datos Predeterminados**
Al primer uso, el sistema inicializa:

#### **Productos de Ejemplo**
- Agua Mineral ($500) - Stock: 20, Mín: 5
- Gatorade ($800) - Stock: 15, Mín: 3
- Coca Cola ($600) - Stock: 25, Mín: 5
- Barrita Cereal ($400) - Stock: 30, Mín: 10
- Toalla Deportiva ($1500) - Stock: 10, Mín: 2

### **🔑 Configuración de Administrador**
- **Contraseña por defecto**: `2580`
- **Ubicación**: `src/components/AdminLogin.tsx`
- **Cambio**: Modificar línea 25 para nueva contraseña

## 🔄 Flujos de Trabajo Principales

### **🛒 Flujo de Venta Completo**
1. **Verificación de turno** (obligatorio)
2. **Selección de productos** con filtros por categoría
3. **Agregado al carrito** con control de stock
4. **Datos del cliente** (nombre, lote) - opcional
5. **Método de pago** (simple o combinado)
6. **Generación automática** de recibo KD-YYYY-NNNNNN
7. **Actualización de stock** automática
8. **Registro en turno** activo
9. **Sonido de confirmación**

### **📦 Flujo de Control de Stock**
1. **Monitoreo automático** con sistema de semáforo
2. **Alertas visuales** por nivel de stock
3. **Movimientos manuales** (entrada/salida/merma)
4. **Actualización automática** desde ventas
5. **Reportes** de stock bajo/crítico
6. **Gráficos** de barras en tiempo real

## 📱 Características PWA

### **🔄 Funcionalidades Offline**
- ✅ **Cache automático** de recursos estáticos
- ✅ **Funcionamiento completo** sin conexión
- ✅ **Actualizaciones automáticas** del service worker

### **📲 Instalación**
- ✅ **Instalable en móviles** (Android/iOS)
- ✅ **Instalable en desktop** (Chrome/Edge/Safari)
- ✅ **Icono personalizado** del kiosco
- ✅ **Splash screen** con branding

## 🛠️ Mantenimiento y Operaciones

### **💾 Gestión de Datos**
```typescript
// Backup completo del sistema
const backupData = await exportData();

// Restaurar desde backup
await importData(backupData);

// Limpiar toda la base de datos
await clearAllData();
```

### **📊 Monitoreo del Sistema**
- **Alertas de stock** automáticas
- **Métricas de performance** en tiempo real
- **Historial de errores** para debugging

## 🐛 Manejo de Errores y Recuperación

### **🛡️ Error Boundaries**
- Captura errores en componentes React
- Fallbacks específicos por módulo
- Recuperación automática cuando es posible
- Información detallada en modo desarrollo

### **✅ Validaciones Implementadas**
- ✅ **Formularios**: Validación en tiempo real
- ✅ **Stock**: Control antes de ventas
- ✅ **Turnos**: Validación de turno activo obligatorio

### **🔄 Recuperación Automática**
- **IndexedDB → localStorage**: Fallback automático
- **Datos corruptos**: Inicialización de datos por defecto
- **Errores de red**: Retry automático en operaciones críticas

## 📈 Métricas y KPIs Avanzados

### **💰 Métricas Financieras**
- **Ingresos totales** por período
- **Ticket promedio** por transacción
- **Proyecciones** semanales y mensuales
- **Análisis de tendencias** automático

### **📊 Métricas Operacionales**
- **Productos más vendidos** (ranking dinámico)
- **Ventas por categoría** con porcentajes
- **Rotación de inventario** por producto
- **Alertas de stock** por nivel de criticidad

## 🤝 Contribución y Desarrollo

### **🔧 Comandos de Desarrollo**
```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Linting
npm run lint
```

### **📋 Estructura de Commits**
```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: estilos/formato
refactor: refactorización
test: pruebas
chore: tareas de mantenimiento
```

### **🧪 Testing y Verificación**
- **Error boundaries**: Captura de errores en desarrollo
- **Validaciones**: Formularios y datos
- **Logs detallados**: Para debugging

## 📞 Soporte y Troubleshooting

### **🔧 Problemas Comunes**

#### **❌ Error de IndexedDB**
- **Síntoma**: Datos no se guardan
- **Solución**: Sistema usa localStorage automáticamente

#### **⚠️ Turno no activo**
- **Síntoma**: No se pueden realizar ventas
- **Solución**: Abrir nuevo turno desde página de ventas

#### **📦 Stock negativo**
- **Síntoma**: Productos con stock < 0
- **Solución**: Ajustar con movimiento de entrada

### **🔍 Herramientas de Debugging**
- **DevTools**: Console para errores detallados
- **Application > Storage**: Verificar datos locales
- **Network**: Problemas de conectividad

## 📄 Licencia y Créditos

Este proyecto está desarrollado como sistema de gestión para kioscos.

**Tecnologías principales**: React, TypeScript, Tailwind CSS, Vite
**Arquitectura**: PWA con persistencia local
**Almacenamiento**: IndexedDB con fallback a localStorage

---

*Sistema de gestión integral para kioscos*

---

## 📞 Contacto y Soporte

Para soporte técnico o nuevas funcionalidades, contactar al equipo de desarrollo.

**Versión actual**: 1.0.0
**Última actualización**: Enero 2025