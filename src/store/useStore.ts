import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Movement, Sale, SaleItem, AdminTurn, TurnClosure } from '../types';
import { 
  getProducts, 
  getMovements, 
  getSales, 
  getAdminTurns,
  getTurnClosures,
  getActiveTurn,
  initializeDefaultData 
} from '../utils/db';

interface StoreState {
  products: Product[];
  movements: Movement[];
  sales: Sale[];
  adminTurns: AdminTurn[];
  turnClosures: TurnClosure[];
  activeTurn: AdminTurn | null;
  cart: SaleItem[];
  isLoading: boolean;
  isAdmin: boolean;
  
  // Actions
  setProducts: (products: Product[]) => void;
  setMovements: (movements: Movement[]) => void;
  setSales: (sales: Sale[]) => void;
  setAdminTurns: (turns: AdminTurn[]) => void;
  setTurnClosures: (closures: TurnClosure[]) => void;
  setActiveTurn: (turn: AdminTurn | null) => void;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
  setAdmin: (isAdmin: boolean) => void;
  
  // Computed
  getCartTotal: () => number;
  refreshData: () => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      movements: [],
      sales: [],
      adminTurns: [],
      turnClosures: [],
      activeTurn: null,
      cart: [],
      isLoading: false,
      isAdmin: false,
      
      setProducts: (products) => set({ products }),
      setMovements: (movements) => set({ movements }),
      setSales: (sales) => set({ sales }),
      setAdminTurns: (adminTurns) => set({ adminTurns }),
      setTurnClosures: (turnClosures) => set({ turnClosures }),
      setActiveTurn: (activeTurn) => set({ activeTurn }),
      setLoading: (isLoading) => set({ isLoading }),
      setAdmin: (isAdmin) => set({ isAdmin }),
      
      addToCart: (product, quantity) => {
        const cart = get().cart;
        const existingItem = cart.find(item => item.product.id === product.id);
        
        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          set({
            cart: cart.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: newQuantity, subtotal: newQuantity * product.price }
                : item
            )
          });
        } else {
          set({
            cart: [...cart, {
              product,
              quantity,
              subtotal: quantity * product.price
            }]
          });
        }
      },
      
      removeFromCart: (productId) => {
        set({
          cart: get().cart.filter(item => item.product.id !== productId)
        });
      },
      
      updateCartQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        set({
          cart: get().cart.map(item =>
            item.product.id === productId
              ? { ...item, quantity, subtotal: quantity * item.product.price }
              : item
          )
        });
      },
      
      clearCart: () => set({ cart: [] }),
      
      getCartTotal: () => {
        return get().cart.reduce((total, item) => total + item.subtotal, 0);
      },
      
      refreshData: async () => {
        set({ isLoading: true });
        try {
          await initializeDefaultData();
          const [products, movements, sales, adminTurns, turnClosures, activeTurn] = await Promise.all([
            getProducts(),
            getMovements(),
            getSales(),
            getAdminTurns(),
            getTurnClosures(),
            getActiveTurn()
          ]);
          
          set({ products, movements, sales, adminTurns, turnClosures, activeTurn });
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'kiosco-digital-store',
      partialize: (state) => ({ 
        isAdmin: state.isAdmin
      })
    }
  )
);