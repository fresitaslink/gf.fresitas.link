import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('fresitas_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fresitas_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, size, toppings, quantity = 1) => {
    const cartKey = `${product.id}-${size}-${(toppings || []).sort().join(',')}`;
    setItems(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + quantity } : i);
      }
      const toppingPrice = (toppings || []).reduce((sum, t) => {
        const tp = (product.toppings || []).find(tp => tp.name_es === t || tp.name_en === t);
        return sum + (tp ? tp.price : 0);
      }, 0);
      const sizePrice = (() => {
        if (!size || !(product.sizes || []).length) return product.price;
        const s = product.sizes.find(s => s.size === size);
        return s ? s.price : product.price;
      })();
      return [...prev, {
        cartKey,
        product_id: product.id,
        name_es: product.name_es,
        name_en: product.name_en,
        image_url: product.image_url,
        size,
        toppings: toppings || [],
        quantity,
        unit_price: sizePrice + toppingPrice,
        price: sizePrice + toppingPrice
      }];
    });
  };

  const removeItem = (cartKey) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey, quantity) => {
    if (quantity < 1) return removeItem(cartKey);
    setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}