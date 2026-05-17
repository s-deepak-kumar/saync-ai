import { useEffect, useState } from 'react';
import { Saync } from '@saync/react';
import './App.css';

// Shape returned by GET /api/products (Vite middleware in vite.config.ts).
interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  imageAlt: string;
  inStock: boolean;
}

type View = 'catalog' | 'checkout' | 'success';

interface CartItem {
  product: Product;
  quantity: number;
}

export function App() {
  const [view, setView] = useState<View>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  // PLANTED BUG: cart count starts at 12 — Badge contract says max=9.
  // Agent's Badge verifier catches the out-of-range value on the
  // very first render of the catalog page.
  const [cart, setCart] = useState<CartItem[]>([
    { product: { id: 99, name: 'Pre-existing item', price: 0, imageUrl: '', imageAlt: '', inStock: true }, quantity: 12 },
  ]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function addToCart(product: Product) {
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, currentCount: cartCount }),
    });
    setCart((c) => [...c, { product, quantity: 1 }]);
  }

  return (
    <Saync.Provider mode="log">
      <Saync.ErrorBoundary name="root">
        <div className="app">
          <Header
            cartCount={cartCount}
            onOpenCart={() => setCartOpen(true)}
            onHome={() => setView('catalog')}
          />

          {view === 'catalog' && (
            <Catalog products={products} onAdd={addToCart} />
          )}
          {view === 'checkout' && (
            <Checkout onPlaced={() => setView('success')} />
          )}
          {view === 'success' && <Success onBack={() => setView('catalog')} />}

          <CartDrawer
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            items={cart}
            onCheckout={() => {
              setCartOpen(false);
              setView('checkout');
            }}
          />
        </div>
      </Saync.ErrorBoundary>
    </Saync.Provider>
  );
}

/* ──────────────────────────────────────────────────────────── */

function Header({ cartCount, onOpenCart, onHome }: {
  cartCount: number;
  onOpenCart: () => void;
  onHome: () => void;
}) {
  return (
    <header className="header">
      <Saync.NavLink
        name="home"
        href="#/"
        expects={{ onNavigate: { toUrl: '#/' }, activeOn: '#/' }}
        onClick={(e) => {
          e.preventDefault();
          onHome();
        }}
      >
        <strong>Saync Shop</strong>
      </Saync.NavLink>
      <div className="header-right">
        <Saync.Button
          name="open-cart"
          onClick={onOpenCart}
          expects={{ onClick: {} }}
          className="cart-btn"
        >
          Cart
          {/* PLANTED BUG #1 (initial cart=12, max=9). Badge contract violated. */}
          <Saync.Badge
            name="cart-count"
            expects={{ visible: true, numberInRange: { min: 0, max: 9 } }}
          >
            {cartCount}
          </Saync.Badge>
        </Saync.Button>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────── */

function Catalog({ products, onAdd }: {
  products: Product[];
  onAdd: (p: Product) => void;
}) {
  return (
    <Saync.Region
      name="catalog-hero"
      expects={{ visibleAt: ['mobile', 'desktop'], notClipped: true, containsText: 'Hand-picked' }}
    >
      <h1>Saync Shop</h1>
      <p className="lede">Hand-picked basics, verifiably correct.</p>

      <Saync.List
        name="product-list"
        expects={{ minItems: 3, itemContains: '$' }}
        className="product-grid"
      >
        {products.map((p) => (
          <li key={p.id} className="product-cell">
            <Saync.Card
              name={`product-${p.id}`}
              expects={{ containsText: p.name }}
            >
              <Saync.Image
                name={`product-${p.id}-img`}
                src={p.imageUrl}
                alt={p.imageAlt}
                // PLANTED BUG #2 lives in api.ts (product 2 has alt="").
                // Contract claims hasAlt:true — verifier catches it.
                expects={{ loads: true, hasAlt: true }}
                className="product-img"
              />
              <div className="product-meta">
                <h3>{p.name}</h3>
                <span className="price">${p.price}</span>
              </div>
              <Saync.Button
                name={`add-${p.id}`}
                disabled={!p.inStock}
                onClick={() => onAdd(p)}
                expects={{
                  onClick: {
                    apiCall: {
                      method: 'POST',
                      url: '/api/cart',
                      expectedStatus: 200,
                      maxDuration: 500,
                    },
                    responseShape: {
                      success: 'boolean',
                      cartCount: 'number',
                      message: 'string',
                    },
                  },
                }}
              >
                {p.inStock ? 'Add to cart' : 'Out of stock'}
              </Saync.Button>
            </Saync.Card>
          </li>
        ))}
      </Saync.List>
    </Saync.Region>
  );
}

/* ──────────────────────────────────────────────────────────── */

function CartDrawer({ open, onClose, items, onCheckout }: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onCheckout: () => void;
}) {
  return (
    <Saync.Drawer
      name="cart-drawer"
      side="right"
      open={open}
      onOpenChange={(o) => !o && onClose()}
      expects={{ closesOnEscape: true, closesOnOutsideClick: true, hasBackdrop: true }}
    >
      <h2>Your cart</h2>
      {items.length === 0 ? (
        <p>Cart is empty.</p>
      ) : (
        <ul className="cart-list">
          {items.map((item, i) => (
            <li key={i}>
              <span>{item.product.name}</span>
              <span>×{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}
      <Saync.Button
        name="go-to-checkout"
        onClick={onCheckout}
        expects={{ onClick: {} }}
      >
        Checkout
      </Saync.Button>
    </Saync.Drawer>
  );
}

/* ──────────────────────────────────────────────────────────── */

function Checkout({ onPlaced }: { onPlaced: () => void }) {
  const [email, setEmail] = useState('');
  const [shipping, setShipping] = useState('standard');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, shipping }),
    });
    if (res.ok) {
      onPlaced();
    } else {
      setError('Order failed. Please try again.');
    }
  }

  return (
    <Saync.Region name="checkout-region" expects={{ containsText: 'Checkout' }}>
      <h1>Checkout</h1>
      <Saync.Form
        name="checkout-form"
        onSubmit={handleSubmit}
        expects={{
          onSubmit: {
            apiCall: { method: 'POST', url: '/api/orders', expectedStatus: 200 },
            responseShape: { success: 'boolean' },
            redirectTo: '/success',
          },
        }}
        className="checkout-form"
      >
        <label>
          Email
          {/* PLANTED BUG #3: declared pattern requires TLD; rendered pattern is too permissive. */}
          <Saync.Input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            pattern="^[^@\s]+@.+$"   // <-- rendered pattern, weak (no TLD requirement)
            expects={{
              validation: {
                required: true,
                type: 'email',
                pattern: '^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$', // <-- declared pattern, strict
              },
            }}
          />
        </label>

        <label>
          Shipping
          {/* PLANTED BUG #4: contract declares 3 allowedValues, only 2 are rendered. */}
          <Saync.Select
            name="shipping-method"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            expects={{
              onChange: {},
              validation: { required: true, allowedValues: ['standard', 'express', 'overnight'] },
            }}
          >
            <option value="standard">Standard (5–7 days)</option>
            <option value="express">Express (2 days)</option>
            {/* missing: overnight */}
          </Saync.Select>
        </label>

        {error && (
          <Saync.Alert name="checkout-error" severity="error"
            expects={{ severity: 'error', containsText: 'failed' }}>
            {error}
          </Saync.Alert>
        )}

        <Saync.Button
          name="place-order"
          type="submit"
          expects={{
            onClick: {
              apiCall: { method: 'POST', url: '/api/orders', expectedStatus: 200 },
            },
          }}
        >
          Place order
        </Saync.Button>
      </Saync.Form>
    </Saync.Region>
  );
}

/* ──────────────────────────────────────────────────────────── */

function Success({ onBack }: { onBack: () => void }) {
  return (
    <Saync.Region name="success-region" expects={{ containsText: 'Thank you' }}>
      <h1>Thank you!</h1>
      <p>Your order has been placed.</p>
      <Saync.Button
        name="back-to-shop"
        onClick={onBack}
        expects={{ onClick: {} }}
      >
        Back to shop
      </Saync.Button>
    </Saync.Region>
  );
}
