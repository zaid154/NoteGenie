// FLOW: Storefront cart state. Client-side only (localStorage) — digital goods need no
// server cart; prices/ownership are re-validated server-side at checkout. StoreLayout's cart
// badge and the Cart page read this via useCart().

import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "notegenie_store_cart";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  // items: [{ kind:'resource'|'combo', id, title, price(paise), isPaid, resourceType, courseCode }]
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [items]);

  function add(item) {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
  }
  function remove(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function clear() {
    setItems([]);
  }
  function has(id) {
    return items.some((i) => i.id === id);
  }

  const count = items.length;
  const subtotalPaise = items.reduce((sum, i) => sum + (i.isPaid ? Number(i.price) || 0 : 0), 0);

  return (
    <CartContext.Provider value={{ items, add, remove, clear, has, count, subtotalPaise }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx === null) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
