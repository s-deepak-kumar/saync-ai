import { useState } from 'react';
import { SayncButton } from '@saync/react';
import './App.css';

interface CartItem {
  id: number;
  name: string;
}

export function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    setLoading(true);
    
    // Simulate API call
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        productId: 123,
        quantity: 1 
      }),
    });

    await response.json();
    
    setCart(prev => [...prev, {
      id: Date.now(), 
      name: `Item ${prev.length + 1}` 
    }]);
    
    setLoading(false);
  };

  return (
    <div className="app">
      <div className="card">
        <h1>🛒 Saync Demo App</h1>
        <p className="subtitle">
          This demo shows Saync in action. The "Add to Cart" button has declared expectations
          that will be automatically verified by the Saync agent.
        </p>

        <div className="cart-section">
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            <span className="cart-count">{cart.length} items</span>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="empty-cart">Your cart is empty</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  {item.name}
                </div>
              ))
            )}
          </div>

          <SayncButton
            className="add-button"
            onClick={handleAddToCart}
            disabled={loading}
            expect={{
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
            sourceFile="src/App.tsx"
            sourceLine={64}
          >
            {loading ? 'Adding...' : 'Add to Cart'}
          </SayncButton>
        </div>

        <div className="info-box">
          <h3>💡 How it works</h3>
          <ol>
            <li>The button above is wrapped with <code>SayncButton</code></li>
            <li>It declares expectations: API call to POST /api/cart, 200 status, response shape</li>
            <li>Run <code>pnpm test:saync</code> to verify these expectations automatically</li>
            <li>The Saync agent will click the button and validate everything matches</li>
          </ol>
        </div>

        <div className="expectations-display">
          <h3>📋 Declared Expectations</h3>
          <pre>{JSON.stringify({
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
          }, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
