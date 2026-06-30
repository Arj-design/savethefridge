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

  // Ref so the (async) notification click handler always calls the latest
  // setCurrentView without needing to re-create the effect/closure.
  const setCurrentViewRef = useRef(setCurrentView);
  setCurrentViewRef.current = setCurrentView;

  // Load everything from localStorage on mount
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

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Save products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    checkExpirations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Persist shopping list
  useEffect(() => {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(shoppingList));
  }, [shoppingList]);

  // Persist removed-products history (used for shopping-list suggestions)
  useEffect(() => {
    localStorage.setItem(REMOVED_HISTORY_KEY, JSON.stringify(removedHistory));
  }, [removedHistory]);

  // Persist dismissed suggestions
  useEffect(() => {
    localStorage.setItem(DISMISSED_SUGGESTIONS_KEY, JSON.stringify(dismissedSuggestions));
  }, [dismissedSuggestions]);

  // Check for expiring products
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

    // Send browser notification if there are expiring items
    if (newNotifications.length > 0 && Notification.permission === 'granted') {
      const count = newNotifications.length;
      new Notification('SaveTheFridge Alert', {
        body: `${count} product${count > 1 ? 's' : ''} expiring soon!`,
        icon: '/vite.svg',
        badge: '/vite.svg'
      });

      // Also try to suggest a recipe using the expiring products (max once a day)
      const expiringProducts = products.filter(p =>
        newNotifications.some(n => n.id === p.id)
      );
      maybeSendRecipeNotification(expiringProducts);
    }
  };

  // Send (at most once per day) a notification suggesting a recipe that
  // uses the products which are about to expire.
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

      const notification = new Notification('🍳 Recipe idea to save your food!', {
        body: `Try "${recipe.title}" — uses ${recipe.usedIngredientCount} of your expiring product${recipe.usedIngredientCount > 1 ? 's' : ''}.`,
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
        // Keep most-recent-first, dedup by name, cap history length
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

  // ----- Shopping list -----

  const addShoppingItem = (name, source = 'manual') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Avoid duplicate (case-insensitive) unchecked items
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
