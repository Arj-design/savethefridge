import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getRecipesByIngredients, extractIngredientNames } from '../utils/recipeUtils';

const AppContext = createContext();

const PRODUCTS_KEY = 'saveTheFridgeProducts';
const SHOPPING_LIST_KEY = 'saveTheFridgeShoppingList';
const REMOVED_HISTORY_KEY = 'saveTheFridgeRemovedHistory';
const DISMISSED_SUGGESTIONS_KEY = 'saveTheFridgeDismissedSuggestions';
const LAST_RECIPE_NOTIF_KEY = 'saveTheFridgeLastRecipeNotif';

export function AppProvider({ children }) {
  const [currentView, setCurrentView] = useState('fridge');
  const [products, setProducts] = useState([]);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [removedHistory, setRemovedHistory] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

  const setCurrentViewRef = useRef(setCurrentView);
  setCurrentViewRef.current = setCurrentView;

  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem(PRODUCTS_KEY);
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedShoppingList = localStorage.getItem(SHOPPING_LIST_KEY);
      if (savedShoppingList) setShoppingList(JSON.parse(savedShoppingList));

      const savedRemovedHistory = localStorage.getItem(REMOVED_HISTORY_KEY);
      if (savedRemovedHistory) setRemovedHistory(JSON.parse(savedRemovedHistory));

      const savedDismissed = localStorage.getItem(DISMISSED_SUGGESTIONS_KEY);
      if (savedDismissed) setDismissedSuggestions(JSON.parse(savedDismissed));
    } catch (error) {
      console.error('Error loading saved data:', error);
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    checkExpirations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem(REMOVED_HISTORY_KEY, JSON.stringify(removedHistory));
  }, [removedHistory]);

  useEffect(() => {
    localStorage.setItem(DISMISSED_SUGGESTIONS_KEY, JSON.stringify(dismissedSuggestions));
  }, [dismissedSuggestions]);

  const checkExpirations = () => {
    const now = new Date();
    const newNotifications = [];

    products.forEach(product => {
      const expiryDate = new Date(product.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (product.reminderDays >= daysUntilExpiry && daysUntilExpiry >= 0) {
        newNotifications.push({
          id: product.id,
          name: product.name,
          daysLeft: daysUntilExpiry
        });
      }
    });

    setNotifications(newNotifications);

    if (newNotifications.length > 0 && Notification.permission === 'granted') {
      const count = newNotifications.length;
      new Notification('SaveTheFridge Alert', {
        body: `${count} prodott${count > 1 ? 'i' : 'o'} in scadenza!`,
        icon: '/vite.svg',
        badge: '/vite.svg'
      });

      const expiringProducts = products.filter(p =>
        newNotifications.some(n => n.id === p.id)
      );
      maybeSendRecipeNotification(expiringProducts);
    }
  };

  const maybeSendRecipeNotification = async (expiringProducts) => {
    if (Notification.permission !== 'granted') return;
    if (!expiringProducts || expiringProducts.length === 0) return;

    const today = new Date().toDateString();
    const lastSent = localStorage.getItem(LAST_RECIPE_NOTIF_KEY);
    if (lastSent === today) return;

    try {
      const ingredients = extractIngredientNames(expiringProducts);
      if (ingredients.length === 0) return;

      const recipes = await getRecipesByIngredients(ingredients, 1);
      if (!recipes || recipes.length === 0) return;

      const recipe = recipes[0];
      localStorage.setItem(LAST_RECIPE_NOTIF_KEY, today);

      const notification = new Notification('🍳 Ricetta per salvare il cibo!', {
        body: `Prova "${recipe.title}" — usa ${recipe.usedIngredientCount} dei tuoi prodotti in scadenza.`,
        icon: recipe.image || '/vite.svg',
        badge: '/vite.svg'
      });

      notification.onclick = () => {
        window.focus();
        setCurrentViewRef.current('recipes');
        notification.close();
      };
    } catch (error) {
      console.error('Error sending recipe notification:', error);
    }
  };

  const addProduct = (product) => {
    setProducts([...products, { ...product, id: Date.now() }]);
  };

  const removeProduct = (id) => {
    const removed = products.find(p => p.id === id);
    if (removed) {
      setRemovedHistory(prev => {
        const entry = {
          name: removed.name,
          brand: removed.brand,
          image: removed.image,
          removedDate: new Date().toISOString()
        };
        const filtered = prev.filter(
          item => item.name.toLowerCase() !== removed.name.toLowerCase()
        );
        return [entry, ...filtered].slice(0, 30);
      });
    }
    setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id, updates) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addShoppingItem = (name, source = 'manual') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const alreadyThere = shoppingList.some(
      item => item.name.toLowerCase() === trimmed.toLowerCase() && !item.checked
    );
    if (alreadyThere) return;

    setShoppingList(prev => [
      ...prev,
      { id: Date.now() + Math.random(), name: trimmed, checked: false, source }
    ]);
  };

  const toggleShoppingItem = (id) => {
    setShoppingList(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const removeShoppingItem = (id) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const clearCheckedShoppingItems = () => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  };

  const dismissSuggestion = (name) => {
    setDismissedSuggestions(prev => [...new Set([...prev, name.toLowerCase()])]);
  };

  const value = {
    currentView,
    setCurrentView,
    products,
    addProduct,
    removeProduct,
    updateProduct,
    scannedProduct,
    setScannedProduct,
    notifications,
    shoppingList,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearCheckedShoppingItems,
    removedHistory,
    dismissedSuggestions,
    dismissSuggestion
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
