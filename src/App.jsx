import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingCart,
  Search,
  X,
  Plus,
  Minus,
  CheckCircle2,
  ShoppingBag,
  Loader2,
  Phone,
  MapPin,
  Building,
  Truck,
  RotateCcw,
  ShieldCheck,
  MessageCircle,
  Mail,
  Menu,
  Send,
  Eye,
  UserRound,
  LogOut
} from 'lucide-react';

// ==========================================
// 1. SUPABASE CLIENT SETUP (FALLBACK & BACKUP)
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;




function formatHhcProducts(allProducts) {
  const customPrices = { 186: 1450, 996: 1890 };
  const customCategories = {
    186: 'Health & Personal Care',
    996: 'Electronics & Gadgets'
  };

  const excludedProductIds = new Set([
    3771851, 3771885, 3771871, 3771721
  ]);

  return allProducts
    .filter(item =>
      Number(item.quantity) > 0 &&
      Number(item.stockStatus) === 1 &&
      String(item.product_status).toLowerCase() === 'publish' &&
      !excludedProductIds.has(Number(item.id))
    )
    .map(item => {
      let categories = item.categories;

      if (typeof categories === 'string') {
        try {
          categories = JSON.parse(categories);
        } catch {
          categories = [];
        }
      }

      const category =
        customCategories[item.id] ||
        (Array.isArray(categories) && categories.length
          ? categories[0]?.name || 'General'
          : 'General');

      const wholesaleCost = Number(
        item.salePrice || item.wholesalePrice || item.price || 0
      );

      const price = customPrices[item.id] !== undefined
        ? customPrices[item.id]
        : wholesaleCost > 0 ? wholesaleCost + 1000 : 999;

      const image =
        item.product_thumbnail ||
        item.featured_image ||
        item.main_image ||
        item.image ||
        item.image_url ||
        (Array.isArray(item.product_galleries)
          ? item.product_galleries[0]
          : null) ||
        'https://via.placeholder.com/400x400?text=No+Image';

      return {
        id: item.id,
        name: item.name || item.title || 'Product',
        price,
        costPrice: wholesaleCost,
        image,
        category,
        description: item.description
          ? item.description.replace(/<[^>]*>?/gm, '')
          : 'Premium quality guaranteed by Bazaar Retail.',
        stockQuantity: item.quantity || 0
      };
    });
}


// BAZAAR_USER_CART_SYNC_V1
const GUEST_CART_KEY = 'bazaar_guest_cart';

function readGuestCart() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function mergeCartItems(saved, guest) {
  const items = new Map();

  for (const item of [...saved, ...guest]) {
    if (item?.id == null) continue;
    const key = String(item.id);
    const previous = items.get(key);
    const quantity = Math.max(1, Number(item.quantity) || 1);

    if (previous) {
      items.set(key, {
        ...previous,
        quantity: previous.quantity + quantity
      });
    } else {
      items.set(key, { ...item, quantity });
    }
  }

  return [...items.values()];
}

export default function App() {
  // ==========================================
  // 2. STATE MANAGEMENT
  // ==========================================
  const [products, setProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const [activeBanner, setActiveBanner] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cities, setCities] = useState([]); // HHC Serviceable Cities
  // const [businessProfileId, setBusinessProfileId] = useState(null); // Required for Orders
  const [loading, setLoading] = useState(true);
  // Guest cart persists across page refreshes.
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('bazaar_guest_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const cartOwnerRef = useRef(null);
  const cartRevisionRef = useRef(0);
  const cartSyncQueueRef = useRef(Promise.resolve());
  const cartRef = useRef(cart);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isTestOrder, setIsTestOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Product Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Navigation State
  const [currentPage, setCurrentPage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Newsletter States
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);

  // AI Chatbot States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Assalam-o-Alaikum! 👋 Bazaar Retail AI Support mein khushamdeed. Aap kis baare mein poochna chahte hain?' }
  ]);
  const [userQuery, setUserQuery] = useState('');

  // Checkout Form State (City is now a dropdown expecting composite ID like "2-105")
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '', 
    address: ''
  });


  // BAZAAR_AUTH_START
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (active) {
        if (!error) setAuthUser(data.user ?? null);
        setAuthLoading(false);
      }
    }).catch(() => {
      if (active) setAuthLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setAuthUser(session?.user ?? null);
        if (session?.user) setIsAuthOpen(false);
        setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthNotice('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setIsAuthOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setAuthError('Supabase is not configured.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      setAuthError(error.message || 'Google login failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setAuthError('Supabase is not configured.');
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');

    try {
      if (authMode === 'signup') {
        if (authPassword !== authConfirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (authPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: { full_name: authName.trim() },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;

        if (data.session) {
          setIsAuthOpen(false);
        } else {
          setAuthNotice('Check your email to confirm your account.');
        }
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          authEmail.trim(),
          { redirectTo: window.location.origin }
        );
        if (error) throw error;
        setAuthNotice('If this email has an account, a password reset link will be sent.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
        setIsAuthOpen(false);
      }
    } catch (error) {
      setAuthError(error.message || 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    } else {
      setAuthUser(null);
      setIsMobileMenuOpen(false);
    }
  };

  const authDisplayName =
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')[0] ||
    'My Account';
  // BAZAAR_AUTH_END

  // Guest cart and account cart are kept separate.
  useEffect(() => {
    if (authLoading) return;

    const owner = authUser?.id || 'guest';
    const revision = ++cartRevisionRef.current;
    cartOwnerRef.current = null;

    const initializeCart = async () => {
      if (owner === 'guest') {
        const guest = readGuestCart();
        if (revision !== cartRevisionRef.current) return;
        cartRef.current = guest;
        setCart(guest);
        cartOwnerRef.current = 'guest';
        setCartReady(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select('product_id, product_data, quantity')
          .eq('user_id', owner);

        if (error) throw error;
        if (revision !== cartRevisionRef.current) return;

        const saved = (data || []).map(row => ({
          ...row.product_data,
          id: row.product_id,
          quantity: row.quantity
        }));

        const guest = readGuestCart();
        const merged = mergeCartItems(saved, guest);

        if (guest.length) {
          const { error: saveError } = await supabase
            .from('cart_items')
            .upsert(
              merged.map(item => ({
                user_id: owner,
                product_id: String(item.id),
                product_data: item,
                quantity: item.quantity
              })),
              { onConflict: 'user_id,product_id' }
            );

          if (saveError) throw saveError;
          if (revision !== cartRevisionRef.current) return;
          localStorage.removeItem(GUEST_CART_KEY);
        }

        cartRef.current = merged;
        setCart(merged);
        cartOwnerRef.current = owner;
        setCartReady(true);
      } catch (error) {
        console.error('Could not load customer cart:', error);
        if (revision === cartRevisionRef.current) {
          cartRef.current = [];
          setCart([]);
          cartOwnerRef.current = null;
          setCartReady(false);
        }
      }
    };

    initializeCart();
  }, [authUser?.id, authLoading]);

  const changeCart = (updater) => {
    if (
      !cartReady ||
      !cartOwnerRef.current ||
      authLoading ||
      cartOwnerRef.current !== (authUser?.id || 'guest')
    ) return;

    const owner = cartOwnerRef.current;
    const previous = cartRef.current;
    const next = typeof updater === 'function'
      ? updater(previous)
      : updater;

    cartRef.current = next;
    setCart(next);

    if (owner === 'guest') {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
      return;
    }

    const revision = cartRevisionRef.current;

    const previousMap = new Map(
      previous.map(item => [String(item.id), item])
    );

    const nextMap = new Map(
      next.map(item => [String(item.id), item])
    );

    const removedIds = [...previousMap.keys()]
      .filter(id => !nextMap.has(id));

    const changedItems = [...nextMap.values()]
      .filter(item => {
        const oldItem = previousMap.get(String(item.id));
        return !oldItem ||
          JSON.stringify(oldItem) !== JSON.stringify(item);
      });

    cartSyncQueueRef.current = cartSyncQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (revision !== cartRevisionRef.current) return;

        if (changedItems.length) {
          const { error } = await supabase
            .from('cart_items')
            .upsert(
              changedItems.map(item => ({
                user_id: owner,
                product_id: String(item.id),
                product_data: item,
                quantity: item.quantity
              })),
              { onConflict: 'user_id,product_id' }
            );

          if (error) throw error;
        }

        if (revision !== cartRevisionRef.current) return;

        if (removedIds.length) {
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', owner)
            .in('product_id', removedIds);

          if (error) throw error;
        }
      })
      .catch(error => {
        console.error('Cart synchronization failed:', error);
      });
  };

  const clearCartAfterOrder = async (expectedOwner, expectedRevision) => {
    const currentOwner = authUser?.id || 'guest';

    if (
      !cartReady ||
      cartOwnerRef.current !== expectedOwner ||
      currentOwner !== expectedOwner
    ) {
      throw new Error('Account changed during checkout. Please refresh.');
    }

    if (expectedOwner === 'guest') {
      localStorage.setItem(GUEST_CART_KEY, '[]');
      cartRef.current = [];
      setCart([]);
      return;
    }

    // Finish all previously queued cart writes first.
    await cartSyncQueueRef.current;

    if (
      cartOwnerRef.current !== expectedOwner ||
      cartRevisionRef.current !== expectedRevision
    ) {
      throw new Error('Account changed during checkout.');
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', expectedOwner);

    if (error) throw error;

    cartRef.current = [];
    setCart([]);
  };

  // Chatbot Knowledge Base
  const faqAnswers = {
    delivery: "Bazaar Retail ki delivery poore Pakistan mein 3 se 7 working days ke andar ho jaati hai. Delivery charges flat Rs. 250 hain.",
    cod: "Ji bilkul! 100% Cash on Delivery (COD) available hai. Parcel receive karne par doorstep par cash payment karein.",
    returns: "7-Day Return Policy hai. Agar parcel damaged ya wrong aaye toh hum direct replacement ya refund issue karte hain.",
    tracking: "Order confirm hote hi hum phone/WhatsApp par tracking link provide karte hain taakay aap courier status dekh sakein."
  };

  // ==========================================
  // 3. HHC DEVELOPER API INTEGRATION EFFECT
  // ==========================================
  
useEffect(() => {
  const interval = setInterval(() => {
    setActiveBanner(prev => (prev + 1) % 2);
  }, 5000);

  return () => clearInterval(interval);
}, []);

  
  useEffect(() => {
    let isMounted = true;

    const restoreCachedProducts = () => {
      if (!isMounted) return;
      try {
        const cached = JSON.parse(localStorage.getItem('bazaar_products_cache_v1') || 'null');
        if (cached && Array.isArray(cached.products)) {
          setProducts(cached.products);
          setProductPage(1);
          setHasMoreProducts(Boolean(cached.hasMore));
          setLoading(false);
        }
      } catch (error) {
        console.warn('Product cache unavailable:', error);
      }
    };

    queueMicrotask(restoreCachedProducts);


    
const loadHhcData = async () => {
  try {
    // FastAPI backend URL
    const baseUrl = import.meta.env.VITE_API_URL;

    // A. Business Profile is now managed by FastAPI.
    // No HHC API key or business profile request in React.

        // C. FETCH PRODUCTS
        
// FETCH ALL PRODUCTS USING PAGINATION

// FETCH PRODUCTS


// FETCH FIRST PAGE OF HHC PRODUCTS
const productsPromise = fetch(`${baseUrl}/api/products?page=1`);

    // Cities load independently without delaying products.
    (async () => {
    // B. FETCH CITIES FROM FASTAPI
    try {
      const citiesRes = await fetch(`${baseUrl}/api/cities`);

      if (!citiesRes.ok) {
        throw new Error(`Cities API Error: ${citiesRes.status}`);
      }

      const citiesData = await citiesRes.json();

      if (Array.isArray(citiesData) && isMounted) {
        setCities(citiesData);
      }

    } catch (e) {
      console.error("Failed to fetch cities:", e);
    }


    })();

const productsRes = await productsPromise;

if (!productsRes.ok) {
  throw new Error(`Products API Error: ${productsRes.status}`);
}

const productsData = await productsRes.json();
const allProducts = productsData.data || [];

const formattedProducts = formatHhcProducts(allProducts);

if (isMounted) {
  setProducts(formattedProducts);
  setProductPage(1);

  const currentPage = Number(productsData.current_page || 1);
  const perPage = Number(productsData.per_page || 100);
  const total = Number(productsData.total);

  setHasMoreProducts(
    Number.isFinite(total) && total > 0
      ? currentPage * perPage < total
      : allProducts.length >= perPage
  );
}

if (isMounted) {
  try {
    const currentPage = Number(productsData.current_page || 1);
    const perPage = Number(productsData.per_page || 100);
    const total = Number(productsData.total);
    const hasMore = Number.isFinite(total) && total > 0
      ? currentPage * perPage < total
      : allProducts.length >= perPage;

    localStorage.setItem('bazaar_products_cache_v1', JSON.stringify({
      products: formattedProducts,
      hasMore,
      savedAt: Date.now()
    }));
  } catch (error) {
    console.warn('Could not cache products:', error);
  }
}

console.log("HHC Page 1 Products:", allProducts.length);
console.log("Website Products:", formattedProducts.length);

      } catch (err) {
        console.error('API Fetch Error:', err);
        // Supabase Fallback
        if (supabase && isMounted) {
          const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
          if (data) setProducts(data);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHhcData();

    // Newsletter Pop-up Timer
    const timer = setTimeout(() => {
      if (isMounted && !sessionStorage.getItem('newsletter_dismissed')) setIsNewsletterOpen(true);
    }, 1500);

    return () => { isMounted = false; clearTimeout(timer); };
  }, []);



  // ==========================================
  // 4. HANDLERS
  // ==========================================
  const navigateTo = (pageName) => {
    setCurrentPage(pageName);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeNewsletter = () => {
    setIsNewsletterOpen(false);
    sessionStorage.setItem('newsletter_dismissed', 'true');
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setIsSubmittingNewsletter(true);
    try {
      if (supabase) await supabase.from('subscribers').insert([{ email: newsletterEmail }]);
      setNewsletterSubmitted(true);
      sessionStorage.setItem('newsletter_dismissed', 'true');
      setTimeout(() => setIsNewsletterOpen(false), 2000);
    } catch (err) {
      console.error(err);
      setNewsletterSubmitted(true);
      setTimeout(() => setIsNewsletterOpen(false), 2000);
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  const handleOptionClick = (question, type) => {
    setChatMessages((prev) => [...prev, { sender: 'user', text: question }, { sender: 'bot', text: faqAnswers[type] }]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    const input = userQuery.toLowerCase();
    let botReply = "Shukriya! Aapka sawal record ho gaya hai. Hamare support agent jald hi aap se rabta karenge.";

    if (input.includes('delivery') || input.includes('time') || input.includes('dino') || input.includes('kab')) botReply = faqAnswers.delivery;
    else if (input.includes('cod') || input.includes('cash') || input.includes('pay') || input.includes('paisa')) botReply = faqAnswers.cod;
    else if (input.includes('return') || input.includes('refund') || input.includes('wapas') || input.includes('damage')) botReply = faqAnswers.returns;
    else if (input.includes('track') || input.includes('status') || input.includes('order')) botReply = faqAnswers.tracking;
    else if (input.includes('hi') || input.includes('hello') || input.includes('slam') || input.includes('assalam')) botReply = "Walaikum Assalam! Main Bazaar Retail Bot hoon. Delivery, COD ya Return policy ke hawale se koi sawal ho toh zaroor batayein.";

    setChatMessages((prev) => [...prev, { sender: 'user', text: userQuery }, { sender: 'bot', text: botReply }]);
    setUserQuery('');
  };

  const addToCart = (product) => {
    if (!cartReady) {
      alert('Your cart is loading. Please try again.');
      return;
    }
    changeCart((prevCart) => {
      const existing = prevCart.find((item) => String(item.id) === String(product.id));
      if (existing) return prevCart.map((item) => String(item.id) === String(product.id) ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    changeCart((prevCart) =>
      prevCart.map((item) => {
        if (String(item.id) === String(id)) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (id) => changeCart((prevCart) => prevCart.filter((item) => String(item.id) !== String(id)));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal === 0 ? 0 : 250;
  const grandTotal = subtotal + shippingFee;

  // HHC AUTO-ORDER PLACEMENT LOGIC (via secure FastAPI backend)
  const orderRequestIdRef = useRef(null);


const checkoutPayloadKey = JSON.stringify({
  products: cart.map(item => ({
    product_id: item.id,
    quantity: item.quantity
  })),
  full_name: formData.name,
  phone: formData.phone,
  address: formData.address,
  destination_city: formData.city
});

const previousCheckoutPayloadKeyRef = useRef(checkoutPayloadKey);

useEffect(() => {
  if (previousCheckoutPayloadKeyRef.current !== checkoutPayloadKey) {
    orderRequestIdRef.current = null;
    previousCheckoutPayloadKeyRef.current = checkoutPayloadKey;
  }
}, [checkoutPayloadKey]);

  
const handlePlaceOrder = async (e) => {
  e.preventDefault();

  if (isSubmitting) return;

  if (!formData.name || !formData.phone || !formData.city || !formData.address) {
    return alert('Please complete all delivery fields.');
  }

  const checkoutOwner = authUser?.id || 'guest';
  const checkoutRevision = cartRevisionRef.current;

  if (!cartReady || cartOwnerRef.current !== checkoutOwner) {
    alert('Cart is loading. Please try again.');
    return;
  }

  setIsSubmitting(true);

  try {
    const baseUrl = import.meta.env.VITE_API_URL;

    if (!baseUrl) {
      throw new Error('Backend API URL is not configured.');
    }

    // Generate one unique ID per checkout attempt.
    // Reuse the same ID if the request is retried.
    if (!orderRequestIdRef.current) {
      orderRequestIdRef.current = crypto.randomUUID();
    }

    const orderPayload = {
      request_id: orderRequestIdRef.current,
      products: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      })),
      full_name: formData.name,
      address: formData.address,
      destination_city: formData.city,
      phone: formData.phone,
      shp_type: 1,
      payment_method: 'cod'
    };

    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      }
    );

    const result = await response.json().catch(() => ({}));

    const validatedTestOrder =
      response.ok &&
      result.test_mode === true &&
      result.status === 'validated_test' &&
      result.success === false;

    if (!validatedTestOrder && (!response.ok || result.success !== true)) {
      const detail =
        typeof result.detail === 'string'
          ? result.detail
          : typeof result.message === 'string'
            ? result.message
            : 'Failed to place order.';

      throw new Error(detail);
    }

    // Backend has confirmed a real order or a validated test order.
    setIsTestOrder(validatedTestOrder);
    setOrderSubmitted(true);
    orderRequestIdRef.current = null;

    try {
      await clearCartAfterOrder(checkoutOwner, checkoutRevision);
    } catch (cartError) {
      console.error('Order saved but cart cleanup failed:', cartError);
      alert(
        'Your order was placed successfully, but we could not clear your cart. ' +
        'Please do not place the same order again.'
      );
    }

  } catch (err) {
    console.error('Order placement failed:', err);

    alert(
      err.message ||
      'Failed to place order. Please try again.'
    );

  } finally {
    setIsSubmitting(false);
  }
};


  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const handleLoadMoreProducts = async () => {
    if (loadingMore) return;

    // Show products already available in the selected category.
    if (visibleCount < filteredProducts.length) {
      setVisibleCount(prev => prev + 24);
      return;
    }

    if (!hasMoreProducts) return;

    setLoadingMore(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      if (!baseUrl) throw new Error('Backend API URL is not configured.');

      let page = productPage;
      let moreAvailable = hasMoreProducts;
      let matchingCount = 0;
      let pagesFetched = 0;

      const collected = [];
      const knownIds = new Set(products.map(p => String(p.id)));

      // Fetch up to 5 pages per click, looking for matching products.
      while (moreAvailable && matchingCount < 12 && pagesFetched < 5) {
        const nextPage = page + 1;

        const response = await fetch(
          `${baseUrl.replace(/\/$/, '')}/api/products?page=${nextPage}`
        );

        if (!response.ok) {
          throw new Error(`Products API Error: ${response.status}`);
        }

        const data = await response.json();
        const rawProducts = Array.isArray(data.data) ? data.data : [];
        const formatted = formatHhcProducts(rawProducts);

        for (const product of formatted) {
          const id = String(product.id);
          if (knownIds.has(id)) continue;

          knownIds.add(id);
          collected.push(product);

          const matchesCategory =
            selectedCategory === 'All' || product.category === selectedCategory;

          const matchesSearch =
            (product.name || '').toLowerCase().includes(searchTerm.toLowerCase());

          if (matchesCategory && matchesSearch) matchingCount++;
        }

        page = nextPage;
        pagesFetched++;

        const currentPage = Number(data.current_page || nextPage);
        const perPage = Number(data.per_page || 100);
        const total = Number(data.total);

        moreAvailable =
          Number.isFinite(total) && total > 0
            ? currentPage * perPage < total
            : rawProducts.length >= perPage;

        if (rawProducts.length === 0) moreAvailable = false;
      }

      if (collected.length > 0) {
        setProducts(prev => [...prev, ...collected]);
      }

      setProductPage(page);
      setHasMoreProducts(moreAvailable);
      setVisibleCount(prev => prev + 24);

      console.log(
        `Fetched ${pagesFetched} pages, found ${matchingCount} matching products.`
      );

    } catch (error) {
      console.error('Load More failed:', error);
      alert('More products could not be loaded. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };





  // ==========================================
  // 5. MAIN UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#173D2E] font-sans flex flex-col justify-between">
      <div>

        {/* BAZAAR AUTH MODAL */}
        {isAuthOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#102B20]/75 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsAuthOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Bazaar Retail account"
              className="my-auto w-full max-w-md overflow-hidden rounded-[28px] border border-[#BF9F62]/30 bg-[#F5F1E6] shadow-2xl"
            >
              <div className="relative bg-[#173D2E] px-6 pb-6 pt-8 text-center text-[#F5F1E6]">
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(false)}
                  aria-label="Close"
                  className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#BF9F62]/50 bg-[#102B20] font-black text-[#BF9F62]">
                  BR
                </div>
                <h2 className="font-serif text-2xl font-semibold">
                  {authMode === 'account'
                    ? 'My Account'
                    : authMode === 'signup'
                    ? 'Create Your Account'
                    : authMode === 'forgot'
                    ? 'Reset Your Password'
                    : 'Welcome to Bazaar Retail'}
                </h2>
                <p className="mt-2 text-xs text-[#F5F1E6]/75">
                  {authMode === 'account'
                    ? 'Manage your Bazaar Retail session'
                    : 'Your premium shopping experience starts here'}
                </p>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
                {authMode === 'account' && authUser ? (
                  <div className="space-y-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#173D2E]/10">
                      <UserRound className="h-8 w-8 text-[#173D2E]" />
                    </div>
                    <div>
                      <p className="font-serif text-xl font-bold text-[#173D2E]">{authDisplayName}</p>
                      <p className="mt-1 break-all text-sm text-[#173D2E]/60">{authUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleLogout();
                        setIsAuthOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173D2E] px-5 py-3 font-semibold text-white hover:bg-[#235843]"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                ) : (
                  <>
                    {authMode !== 'forgot' && (
                      <>
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={authBusy}
                          className="flex w-full items-center justify-center gap-3 rounded-full border border-[#BF9F62]/50 bg-white px-4 py-3 text-sm font-bold text-[#173D2E] transition hover:bg-[#EFEAE0] disabled:opacity-50"
                        >
                          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 5.38 6.51 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.88 46.98 24.55z" />
                            <path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.51 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
                          </svg>
                          Continue with Google
                        </button>
                        <div className="my-5 flex items-center gap-3 text-xs text-[#173D2E]/40">
                          <span className="h-px flex-1 bg-[#173D2E]/15" />
                          OR CONTINUE WITH EMAIL
                          <span className="h-px flex-1 bg-[#173D2E]/15" />
                        </div>
                      </>
                    )}

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      {authMode === 'signup' && (
                        <label className="block text-xs font-semibold text-[#173D2E]">
                          Full Name
                          <input
                            type="text"
                            required
                            autoComplete="name"
                            value={authName}
                            onChange={(event) => setAuthName(event.target.value)}
                            placeholder="Your full name"
                            className="mt-1.5 w-full rounded-xl border border-[#173D2E]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#BF9F62]"
                          />
                        </label>
                      )}

                      <label className="block text-xs font-semibold text-[#173D2E]">
                        Email Address
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={authEmail}
                          onChange={(event) => setAuthEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="mt-1.5 w-full rounded-xl border border-[#173D2E]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#BF9F62]"
                        />
                      </label>

                      {authMode !== 'forgot' && (
                        <label className="block text-xs font-semibold text-[#173D2E]">
                          Password
                          <div className="relative mt-1.5">
                            <input
                              type={showAuthPassword ? 'text' : 'password'}
                              required
                              minLength={authMode === 'signup' ? 6 : undefined}
                              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                              value={authPassword}
                              onChange={(event) => setAuthPassword(event.target.value)}
                              placeholder="Enter your password"
                              className="w-full rounded-xl border border-[#173D2E]/15 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-[#BF9F62]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAuthPassword(!showAuthPassword)}
                              aria-label="Show or hide password"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#173D2E]/50"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </div>
                        </label>
                      )}

                      {authMode === 'signup' && (
                        <label className="block text-xs font-semibold text-[#173D2E]">
                          Confirm Password
                          <input
                            type={showAuthPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={authConfirmPassword}
                            onChange={(event) => setAuthConfirmPassword(event.target.value)}
                            placeholder="Confirm password"
                            className="mt-1.5 w-full rounded-xl border border-[#173D2E]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#BF9F62]"
                          />
                        </label>
                      )}

                      {authError && (
                        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                          {authError}
                        </p>
                      )}
                      {authNotice && (
                        <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
                          {authNotice}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={authBusy}
                        className="w-full rounded-full bg-[#173D2E] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#235843] disabled:opacity-50"
                      >
                        {authBusy
                          ? 'Please wait...'
                          : authMode === 'signup'
                          ? 'Create Account'
                          : authMode === 'forgot'
                          ? 'Send Reset Link'
                          : 'Sign In'}
                      </button>
                    </form>

                    <div className="mt-5 space-y-3 text-center text-xs">
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot');
                            setAuthError('');
                            setAuthNotice('');
                          }}
                          className="font-semibold text-[#9E7E38] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                      <div>
                        {authMode === 'signup'
                          ? 'Already have an account? '
                          : authMode === 'forgot'
                          ? 'Remember your password? '
                          : "Don't have an account? "}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode(authMode === 'signup' || authMode === 'forgot' ? 'login' : 'signup');
                            setAuthError('');
                            setAuthNotice('');
                            setAuthPassword('');
                            setAuthConfirmPassword('');
                          }}
                          className="font-bold text-[#9E7E38] hover:underline"
                        >
                          {authMode === 'signup' || authMode === 'forgot' ? 'Sign In' : 'Sign Up'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NAVBAR HEADER */}
        <nav className="sticky top-0 z-40 bg-[#F5F1E6]/95 backdrop-blur-md border-b border-[#173D2E]/15 px-4 lg:px-8 py-3.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-3 gap-y-3">
            
            <div className="flex min-w-0 flex-1 lg:flex-none items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-[#EFEAE0] text-[#173D2E] hover:bg-[#E5DEC3]"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div
                className="flex min-w-0 items-center gap-2 cursor-pointer"
                onClick={() => navigateTo('home')}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-[#173D2E] flex items-center justify-center shadow-md">
                  <span className="font-extrabold text-[#BF9F62] tracking-tight text-lg">BR</span>
                </div>
                <span className="text-sm sm:text-xl font-black text-[#173D2E] tracking-tight sm:tracking-wider leading-tight whitespace-nowrap">
                  BAZAAR RETAIL
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#173D2E]">
              <button onClick={() => navigateTo('home')} className={`hover:text-[#BF9F62] transition-colors ${currentPage === 'home' ? 'text-[#BF9F62] font-extrabold border-b-2 border-[#BF9F62]' : ''}`}>Store</button>
              <button onClick={() => navigateTo('about')} className={`hover:text-[#BF9F62] transition-colors ${currentPage === 'about' ? 'text-[#BF9F62] font-extrabold border-b-2 border-[#BF9F62]' : ''}`}>About Us</button>
              <button onClick={() => navigateTo('shipping')} className={`hover:text-[#BF9F62] transition-colors ${currentPage === 'shipping' ? 'text-[#BF9F62] font-extrabold border-b-2 border-[#BF9F62]' : ''}`}>Shipping & Delivery</button>
              <button onClick={() => navigateTo('returns')} className={`hover:text-[#BF9F62] transition-colors ${currentPage === 'returns' ? 'text-[#BF9F62] font-extrabold border-b-2 border-[#BF9F62]' : ''}`}>Returns Policy</button>
              <button onClick={() => navigateTo('faq')} className={`hover:text-[#BF9F62] transition-colors ${currentPage === 'faq' ? 'text-[#BF9F62] font-extrabold border-b-2 border-[#BF9F62]' : ''}`}>FAQ</button>
            </div>

            
{/* MODERN PRODUCT SEARCH */}
<div className="relative order-3 lg:order-none w-full lg:w-72 shrink-0 group">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173D2E]/50 group-focus-within:text-[#9E7E38] transition-colors pointer-events-none" />

  <input
    type="search"
    placeholder="Search products..."
    aria-label="Search products"
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setVisibleCount(24);
    }}
    className="w-full rounded-full border border-[#173D2E]/15 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-[#173D2E] placeholder:text-[#173D2E]/40 shadow-sm outline-none transition-all duration-300 focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/20"
  />

  {searchTerm && (
    <button
      type="button"
      onClick={() => {
        setSearchTerm('');
        setVisibleCount(24);
      }}
      aria-label="Clear search"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#173D2E]/50 hover:text-[#173D2E] transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  )}
</div>



          {/* BAZAAR ACCOUNT BUTTON */}
          <button
            type="button"
            onClick={() => authUser ? openAuth('account') : openAuth('login')}
            aria-label={authUser ? 'My account' : 'Login or sign up'}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#BF9F62]/30 bg-white px-2.5 py-2.5 text-[#173D2E] transition-colors hover:bg-[#EFEAE0] sm:px-3"
          >
            <UserRound className="h-5 w-5" />
            <span className="hidden max-w-24 truncate text-xs font-bold sm:inline">
              {authLoading ? 'Account' : authUser ? authDisplayName : 'Login'}
            </span>
          </button>

          {/* SHOPPING CART BUTTON */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open shopping cart"
            className="relative shrink-0 rounded-xl bg-[#EFEAE0] p-2.5 text-[#173D2E] hover:bg-[#E5DEC3]"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-[#BF9F62] px-1.5 text-xs font-bold">
                {cart.reduce((total, item) => total + (item.quantity || 1), 0)}
              </span>
            )}
          </button>
          </div>
          
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-[#173D2E]/15 flex flex-col space-y-2 text-sm font-semibold text-[#173D2E]">
              <button onClick={() => navigateTo('home')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">Store / All Products</button>
              <button onClick={() => navigateTo('about')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">About Us</button>
              <button onClick={() => navigateTo('shipping')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">Shipping & Delivery</button>
              <button onClick={() => navigateTo('returns')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">Returns Policy</button>
              <button onClick={() => navigateTo('faq')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">FAQ & Support</button>

              <button
                onClick={() => authUser ? openAuth('account') : openAuth('login')}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#EFEAE0]"
              >
                <UserRound className="h-4 w-4" />
                {authUser ? `My Account (${authDisplayName})` : 'Login / Sign Up'}
              </button>
            </div>
          )}
        </nav>

        {/* PAGE 1: HOME STORE FRONT */}
        {currentPage === 'home' && (
          <div>
            
{/* BAZAAR TWO SLIDE HERO */}
<div className="relative">
  <div className={activeBanner === 0 ? 'block' : 'hidden'}>
{/* PREMIUM LUXURY WELCOME SECTION */}
            <section className="relative overflow-hidden bg-[#173D2E] px-5 py-14 text-[#F5F1E6] sm:px-8 sm:py-20">
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-[#BF9F62]/20" />
              <div className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full border border-[#BF9F62]/15" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#BF9F62]/10 blur-3xl" />

              <div className="relative mx-auto max-w-7xl">
                <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-[#D9B977]">
                  Welcome to Bazaar Retail
                </p>
                <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Discover the Art of
                  <span className="block text-[#D9B977]">Everyday Living.</span>
                </h1>
                <p className="mt-6 max-w-xl text-sm leading-7 text-[#F5F1E6]/75 sm:text-base">
                  Thoughtfully selected essentials. Timeless style.
                  A better shopping experience, made for you.
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById('product-catalog')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#BF9F62] px-7 py-3.5 text-sm font-bold text-[#173D2E] transition-all hover:-translate-y-0.5 hover:bg-[#D9B977] hover:shadow-lg"
                >
                  Shop Collection
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </section>
  </div>

  <div className={activeBanner === 1 ? 'block' : 'hidden'}>
    <div className="relative h-[360px] sm:h-[420px] lg:h-[480px] overflow-hidden bg-[#F5F1E6]">
      <img
        src="/banners/bazaar-banner-2.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110"
      />
      <img
        src="/banners/bazaar-banner-2.png"
        alt="Bazaar Retail Premium Collection"
        className="relative w-full h-full object-contain"
      />
    </div>
  </div>

  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 rounded-full bg-[#173D2E]/70 px-4 py-2">
    {[0, 1].map(index => (
      <button
        key={index}
        type="button"
        onClick={() => setActiveBanner(index)}
        aria-label={`Show slide ${index + 1}`}
        className={`h-2.5 rounded-full transition-all ${
          activeBanner === index
            ? 'w-8 bg-[#BF9F62]'
            : 'w-2.5 bg-white/60'
        }`}
      />
    ))}
  </div>
</div>


            {/* TRUST BADGES BAR */}
            <section className="bg-[#173D2E] text-[#F5F1E6] py-6 px-4">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="flex flex-col items-center space-y-1"><ShieldCheck className="w-6 h-6 text-[#BF9F62]" /><span className="font-bold text-xs uppercase tracking-wide">Cash on Delivery</span></div>
                <div className="flex flex-col items-center space-y-1"><Truck className="w-6 h-6 text-[#BF9F62]" /><span className="font-bold text-xs uppercase tracking-wide">Delivery Across Pakistan</span></div>
                <div className="flex flex-col items-center space-y-1"><RotateCcw className="w-6 h-6 text-[#BF9F62]" /><span className="font-bold text-xs uppercase tracking-wide">Easy 7-Day Returns</span></div>
                <div className="flex flex-col items-center space-y-1"><MessageCircle className="w-6 h-6 text-[#BF9F62]" /><span className="font-bold text-xs uppercase tracking-wide">24/7 AI Support</span></div>
              </div>
            </section>

            {/* MAIN CATALOG DISPLAY */}
            <main id="product-catalog" className="max-w-7xl mx-auto px-4 lg:px-8 mt-8">
              
{/* MODERN CATEGORY NAVIGATION */}
<div className="mb-10 rounded-[28px] border border-[#BF9F62]/25 bg-white p-5 shadow-[0_12px_40px_rgba(23,61,46,0.06)] sm:p-8">

  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9E7E38]">
        THE BAZAAR RETAIL COLLECTION
      </span>

      <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#173D2E] sm:text-4xl">
        Discover Your Next Favourite
      </h2>
    </div>

    <span className="text-xs font-medium text-[#173D2E]/60">
      {filteredProducts.length} products available in loaded catalog
    </span>
  </div>

  <div className="flex items-center gap-3 overflow-x-auto border-t border-[#173D2E]/10 pt-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {categories.map((cat) => (
      <button
        key={cat}
        type="button"
        onClick={() => setSelectedCategory(cat)}
        aria-pressed={selectedCategory === cat}
        className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
          selectedCategory === cat
            ? 'border-[#BF9F62] bg-[#173D2E] text-[#F5F1E6] shadow-md ring-1 ring-[#BF9F62]/40'
            : 'border-[#173D2E]/10 bg-white text-[#173D2E]/75 hover:-translate-y-0.5 hover:border-[#BF9F62] hover:bg-[#EFEAE0]'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
</div>


              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="w-10 h-10 text-[#BF9F62] animate-spin" />
                  <p className="text-[#173D2E]/70 text-sm font-medium">Loading Bazaar Retail catalog...</p>
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="text-center py-20 bg-[#EFEAE0]/60 rounded-3xl border border-[#173D2E]/15 my-8">
                  <ShoppingBag className="w-12 h-12 text-[#173D2E]/40 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[#173D2E]">No products found</h3>
                  <p className="text-[#173D2E]/60 text-sm mt-1">Try adjusting your search or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 mt-8">
                  
{visibleProducts.map((product) => (
  <div
    key={product.id}
    onClick={() => setSelectedProduct(product)}
    className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl sm:rounded-[24px] border border-[#BF9F62]/20 bg-white shadow-[0_8px_25px_rgba(23,61,46,0.05)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#BF9F62]/70 hover:shadow-xl cursor-pointer"
  >
    {/* Product Image */}
    <div className="relative aspect-square overflow-hidden bg-[#F5F1E6]">
      <img
        src={product.image || 'https://via.placeholder.com/400x400?text=No+Image'}
        alt={product.name || 'Product'}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />

      {/* Category Badge */}
      {product.category && (
        <span className="absolute left-2 top-2 sm:left-4 sm:top-4 max-w-[85%] truncate rounded-full border border-white/20 bg-[#173D2E]/90 px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold text-white shadow-md backdrop-blur-md">
          {product.category}
        </span>
      )}

      {/* Quick View Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#102B20]/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-3 text-xs font-bold text-[#173D2E] shadow-xl backdrop-blur-md">
          <Eye className="h-4 w-4" />
          Quick View
        </span>
      </div>
    </div>

    {/* Product Information */}
    <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
      <div className="mb-3 sm:mb-5 flex-1">
        <p className="mb-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-[#9E7E38]">
          Bazaar Retail Collection
        </p>

        <h3 className="line-clamp-2 min-h-[40px] sm:min-h-[48px] text-sm sm:text-base font-bold leading-snug text-[#173D2E] transition-colors group-hover:text-[#9E7E38]">
          {product.name}
        </h3>

        <p
          className="mt-2 hidden text-xs leading-relaxed text-[#173D2E]/60 sm:line-clamp-2"
          style={{
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {product.description || 'Premium quality guaranteed by Bazaar Retail.'}
        </p>
      </div>

      {/* Price & Cart */}
      <div className="flex flex-col items-stretch gap-3 border-t border-[#173D2E]/10 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
        <div>
          <span className="block text-[11px] font-medium text-[#173D2E]/50">
            Price
          </span>

          <span className="text-base sm:text-xl font-extrabold tracking-tight text-[#173D2E]">
            Rs. {Number(product.price || 0).toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product);
          }}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#BF9F62] px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#173D2E] shadow-sm transition-all duration-300 hover:bg-[#173D2E] hover:text-white hover:shadow-lg active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Add</span>
        </button>
      </div>
    </div>
  </div>
))}

                </div>
                
              )}


{(visibleCount < filteredProducts.length || hasMoreProducts) && (
  <div className="flex flex-col items-center py-10 gap-3">
    <p className="text-sm text-[#173D2E]/70">
      Showing {visibleProducts.length} products
    </p>

    <button
      onClick={handleLoadMoreProducts}
      disabled={loadingMore}
      className="bg-[#173D2E] hover:bg-[#235843] text-[#F5F1E6] font-bold px-8 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
    >
      {loadingMore ? 'Loading Products...' : 'Load More Products'}
    </button>
  </div>
)}



              {/* WHY SHOP SECTION */}
              <section className="mt-16 py-12 px-6 bg-[#EFEAE0]/80 rounded-3xl border border-[#173D2E]/15 space-y-6">
                <h2 className="text-2xl font-extrabold text-[#173D2E] text-center">
                  Why Shop at BAZAARRETAIL?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-[#173D2E]/80">
                  <div className="p-4 bg-[#F5F1E6] rounded-2xl border border-[#173D2E]/10">
                    <h3 className="font-bold text-[#173D2E] text-base mb-1">Pay on Delivery</h3>
                    <p>Inspect your order and pay cash when it reaches your doorstep.</p>
                  </div>
                  <div className="p-4 bg-[#F5F1E6] rounded-2xl border border-[#173D2E]/10">
                    <h3 className="font-bold text-[#173D2E] text-base mb-1">Nationwide Delivery</h3>
                    <p>We deliver to Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad and across Pakistan.</p>
                  </div>
                  <div className="p-4 bg-[#F5F1E6] rounded-2xl border border-[#173D2E]/10">
                    <h3 className="font-bold text-[#173D2E] text-base mb-1">Honest Prices</h3>
                    <p>Clear prices in PKR with no hidden fees at checkout.</p>
                  </div>
                  <div className="p-4 bg-[#F5F1E6] rounded-2xl border border-[#173D2E]/10">
                    <h3 className="font-bold text-[#173D2E] text-base mb-1">Real Support</h3>
                    <p>Use our 24/7 on-site AI Chatbot or contact us for instant resolution.</p>
                  </div>
                </div>
              </section>

              {/* HOW IT WORKS SECTION */}
              <section className="my-12 py-10 px-6 text-center space-y-6">
                <h2 className="text-2xl font-extrabold text-[#173D2E]">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-[#173D2E] text-[#BF9F62] rounded-full flex items-center justify-center font-bold text-lg mx-auto">1</div>
                    <h4 className="font-bold text-[#173D2E]">Choose & Order</h4>
                    <p className="text-xs text-[#173D2E]/70">Select your favorite item and tap Order Now.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-[#173D2E] text-[#BF9F62] rounded-full flex items-center justify-center font-bold text-lg mx-auto">2</div>
                    <h4 className="font-bold text-[#173D2E]">Address Confirmation</h4>
                    <p className="text-xs text-[#173D2E]/70">Enter details. We confirm your parcel via call or message.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-[#173D2E] text-[#BF9F62] rounded-full flex items-center justify-center font-bold text-lg mx-auto">3</div>
                    <h4 className="font-bold text-[#173D2E]">Receive & Pay</h4>
                    <p className="text-xs text-[#173D2E]/70">Receive your parcel at your doorstep and pay Cash on Delivery.</p>
                  </div>
                </div>
              </section>
            </main>
          </div>
        )}

        {/* PAGE 2: ABOUT US */}
        {currentPage === 'about' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <div className="border-b border-[#173D2E]/15 pb-6">
              <span className="text-xs font-bold text-[#BF9F62] uppercase tracking-wider">About BAZAARRETAIL</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#173D2E] mt-1">Simple, Honest & Safe Shopping in Pakistan</h1>
            </div>
            <div className="space-y-6 text-[#173D2E]/80 leading-relaxed text-sm sm:text-base">
              <p>
                <strong>BAZAARRETAIL</strong> is a Pakistan-based online store built around one core idea: shopping online should be simple, honest, and completely safe. We bring useful everyday products from trusted suppliers directly to your doorstep, and you pay only when you receive your order.
              </p>
              <h3 className="text-xl font-bold text-[#173D2E] pt-2">What We Sell</h3>
              <p>
                We focus on practical categories designed for modern Pakistani homes: kitchen tools & gadgets, grooming and personal care, mobile and car accessories, kids' educational items, home decor, and fitness essentials. Each product is carefully chosen for usefulness, fair pricing, and daily reliability.
              </p>
              <h3 className="text-xl font-bold text-[#173D2E] pt-2">Our Promise</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Clear product information and honest item descriptions.</li>
                <li>Reliable Cash on Delivery across Karachi, Lahore, Islamabad, and all major Pakistani cities.</li>
                <li>Instant 24/7 support right on the website.</li>
                <li>A straightforward, hassle-free 7-day return process if an item arrives damaged or incorrect.</li>
              </ul>
            </div>
          </div>
        )}

        {/* PAGE 3: SHIPPING POLICY */}
        {currentPage === 'shipping' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <div className="border-b border-[#173D2E]/15 pb-6">
              <span className="text-xs font-bold text-[#BF9F62] uppercase tracking-wider">Policy</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#173D2E] mt-1">Shipping & Delivery Policy</h1>
            </div>
            <div className="space-y-6 text-[#173D2E]/80 text-sm sm:text-base">
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-1">Where We Deliver</h3>
                <p>We deliver nationwide across Pakistan, including Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, and most regional towns.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-1">Processing & Order Confirmation</h3>
                <p>To prevent fake or mistaken orders, every order is confirmed by phone call or SMS before dispatch. Dispatches take place within 1 to 2 working days after confirmation.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-1">Delivery Time & Charges</h3>
                <p>Standard delivery takes <strong>3 to 7 working days</strong> across Pakistan. Flat delivery charges are Rs. 250 per order.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-1">Cash on Delivery (COD)</h3>
                <p>Pay cash to the courier representative when your parcel arrives. Please keep the exact payable amount ready upon delivery.</p>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: RETURNS POLICY */}
        {currentPage === 'returns' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <div className="border-b border-[#173D2E]/15 pb-6">
              <span className="text-xs font-bold text-[#BF9F62] uppercase tracking-wider">Guarantee</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#173D2E] mt-1">Returns & Refund Policy</h1>
            </div>
            <div className="space-y-6 text-[#173D2E]/80 text-sm sm:text-base">
              <div className="p-4 bg-[#EFEAE0] rounded-2xl border border-[#173D2E]/15 font-semibold text-[#173D2E]">
                Return Window: You can request a return within 7 days of receiving your order.
              </div>
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-2">Eligible Conditions for Return</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Item arrived damaged, broken, or defective.</li>
                  <li>You received the wrong product.</li>
                  <li>The item is significantly different from description.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-2">Unboxing Video Recommendation</h3>
                <p>We strongly recommend recording a quick unboxing video when opening your parcel. This helps us resolve damage or missing component claims instantly.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#173D2E] text-lg mb-2">How to Request a Return</h3>
                <p>Contact our customer support team with your order number and photos/video of the issue within 7 days. Once verified, we will issue a replacement or refund via JazzCash, EasyPaisa, or Bank Transfer within 5 to 7 working days.</p>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: FAQ & HELP CENTER */}
        {currentPage === 'faq' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <div className="border-b border-[#173D2E]/15 pb-6">
              <span className="text-xs font-bold text-[#BF9F62] uppercase tracking-wider">Help Center</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#173D2E] mt-1">Frequently Asked Questions</h1>
            </div>
            <div className="space-y-4">
              <div className="p-5 bg-[#EFEAE0]/80 rounded-2xl border border-[#173D2E]/15">
                <h3 className="font-bold text-[#173D2E] text-base mb-1">Do you offer Cash on Delivery across Pakistan?</h3>
                <p className="text-xs sm:text-sm text-[#173D2E]/80">Yes! You pay cash to the courier representative when your parcel is delivered to your house.</p>
              </div>
              <div className="p-5 bg-[#EFEAE0]/80 rounded-2xl border border-[#173D2E]/15">
                <h3 className="font-bold text-[#173D2E] text-base mb-1">How long does delivery take?</h3>
                <p className="text-xs sm:text-sm text-[#173D2E]/80">Delivery typically takes 3 to 7 working days after phone or order confirmation.</p>
              </div>
              <div className="p-5 bg-[#EFEAE0]/80 rounded-2xl border border-[#173D2E]/15">
                <h3 className="font-bold text-[#173D2E] text-base mb-1">Why do you call or message to confirm orders?</h3>
                <p className="text-xs sm:text-sm text-[#173D2E]/80">Order confirmation helps verify your exact address and prevents fake or accidental orders.</p>
              </div>
              <div className="p-5 bg-[#EFEAE0]/80 rounded-2xl border border-[#173D2E]/15">
                <h3 className="font-bold text-[#173D2E] text-base mb-1">What if my item arrives damaged?</h3>
                <p className="text-xs sm:text-sm text-[#173D2E]/80">Contact us within 7 days with pictures/video, and we will send a free replacement.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL FOOTER COMPONENT */}
      <footer className="mt-20 border-t-4 border-[#BF9F62] bg-[#173D2E] pt-14 pb-7 text-[#F5F1E6] sm:pt-20">
        <div className="mx-auto mb-12 grid max-w-7xl grid-cols-1 gap-10 px-5 text-sm sm:grid-cols-2 sm:gap-12 lg:grid-cols-4 lg:px-8">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#F5F1E6]/20 bg-[#BF9F62] font-serif text-lg font-bold text-[#173D2E] shadow-lg">BR</div>
              <span className="font-serif text-xl font-bold tracking-wider text-[#F5F1E6]">BAZAAR RETAIL</span>
            </div>
            <p className="text-sm leading-7 text-[#F5F1E6]/65">
              Everyday essentials & smart finds delivered nationwide across Pakistan with Cash on Delivery.
            </p>
          </div>
          <div>
            <h4 className="mb-5 font-semibold uppercase tracking-[0.18em] text-[#BF9F62] text-xs">Quick Navigation</h4>
            <ul className="space-y-3 text-sm text-[#F5F1E6]/75">
              <li><button onClick={() => navigateTo('home')} className="text-left transition-colors duration-200 hover:text-[#BF9F62]">Home Store</button></li>
              <li><button onClick={() => navigateTo('about')} className="text-left transition-colors duration-200 hover:text-[#BF9F62]">About Us</button></li>
              <li><button onClick={() => navigateTo('shipping')} className="text-left transition-colors duration-200 hover:text-[#BF9F62]">Shipping & Delivery</button></li>
              <li><button onClick={() => navigateTo('returns')} className="text-left transition-colors duration-200 hover:text-[#BF9F62]">Returns & Refunds</button></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-5 font-semibold uppercase tracking-[0.18em] text-[#BF9F62] text-xs">Customer Support</h4>
            <ul className="space-y-3 text-sm text-[#F5F1E6]/75">
              <li><button onClick={() => navigateTo('faq')} className="text-left transition-colors duration-200 hover:text-[#BF9F62]">Frequently Asked Questions</button></li>
              <li><span>Cash on Delivery Available</span></li>
              <li><span>3-7 Days Delivery Across Pakistan</span></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="mb-5 font-semibold uppercase tracking-[0.18em] text-[#BF9F62] text-xs">Shopping Guarantee</h4>
            <p className="text-xs text-[#F5F1E6]/70">
              Check your parcel upon delivery. 100% genuine Pakistani dropshipping store.
            </p>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-[#BF9F62]/25 px-5 pt-7 text-center text-xs text-[#F5F1E6]/55 sm:flex-row sm:text-left lg:px-8">
          <p>© 2026 BAZAAR RETAIL Pakistan. All Rights Reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            <button onClick={() => navigateTo('shipping')} className="transition-colors hover:text-[#BF9F62]">Shipping</button>
            <button onClick={() => navigateTo('returns')} className="transition-colors hover:text-[#BF9F62]">Returns</button>
            <button onClick={() => navigateTo('faq')} className="transition-colors hover:text-[#BF9F62]">FAQ</button>
          </div>
        </div>
      </footer>

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#071A13]/75 backdrop-blur-md animate-fadeIn">
          <div className="relative flex w-full max-w-4xl max-h-[90dvh] flex-col overflow-y-auto md:overflow-hidden rounded-[28px] border border-[#BF9F62]/30 bg-[#F5F1E6] shadow-2xl md:flex-row">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-3 top-3 z-20 rounded-full bg-white/95 p-2.5 text-[#173D2E] shadow-md transition-all hover:bg-[#173D2E] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex h-56 w-full shrink-0 items-center justify-center overflow-hidden bg-[#E5DEC3] sm:h-80 md:h-auto md:w-1/2">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-contain p-4 sm:p-6" />
            </div>
            <div className="flex w-full min-w-0 flex-col justify-between gap-6 p-5 sm:p-8 md:w-1/2 md:overflow-y-auto">
              <div className="space-y-3">
                <span className="inline-block rounded-full border border-[#BF9F62]/40 bg-[#173D2E] px-3 py-1.5 text-[11px] font-semibold text-[#F5F1E6]">
                  {selectedProduct.category}
                </span>
                <h2 className="font-serif text-2xl font-semibold leading-tight text-[#173D2E] sm:text-3xl">{selectedProduct.name}</h2>
                <div className="text-2xl font-extrabold tracking-tight text-[#9E7E38] sm:text-3xl">
                  Rs. {Number(selectedProduct.price).toLocaleString()}
                </div>
                <div className="border-t border-[#173D2E]/15 pt-3">
                  <h4 className="text-xs font-bold text-[#173D2E] uppercase tracking-wider mb-1">Description</h4>
                  <p className="max-h-40 overflow-y-auto pr-1 text-sm leading-6 text-[#173D2E]/75">
                    {selectedProduct.description}
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t border-[#173D2E]/15">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#173D2E]/80">
                  <Truck className="w-4 h-4 text-[#BF9F62]" /> 3-7 Days Nationwide COD Delivery
                </div>
                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#BF9F62] px-4 py-3.5 text-sm font-bold text-[#173D2E] shadow-md transition-all hover:bg-[#173D2E] hover:text-white"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart (Rs. {selectedProduct.price.toLocaleString()})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHATBOT WIDGET */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
        {isChatOpen && (
          <div className="mb-3 flex h-[min(480px,calc(100dvh-110px))] w-[calc(100vw-32px)] max-w-[370px] flex-col overflow-hidden rounded-3xl border border-[#BF9F62]/35 bg-[#F5F1E6] shadow-2xl transition-all sm:mb-4">
            <div className="flex shrink-0 items-center justify-between border-b border-[#BF9F62]/30 bg-[#173D2E] p-4 text-[#F5F1E6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#BF9F62] text-[#173D2E] flex items-center justify-center font-bold text-xs">BR</div>
                <div>
                  <h4 className="font-bold text-sm leading-none">Bazaar Retail Bot</h4>
                  <span className="text-[10px] text-[#BF9F62]">Instant AI Support 24/7</span>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-[#F5F1E6]/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#EFEAE0]/40 p-4 text-xs leading-relaxed">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-[#173D2E] text-[#F5F1E6] rounded-br-none' : 'bg-white text-[#173D2E] border border-[#173D2E]/10 shadow-sm rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-[#BF9F62]/20 bg-[#EFEAE0] p-2">
              <button onClick={() => handleOptionClick('Delivery time kya hai?', 'delivery')} className="text-[10px] bg-white text-[#173D2E] border border-[#173D2E]/20 px-2.5 py-1 rounded-full font-medium hover:bg-[#173D2E] hover:text-[#F5F1E6] transition-colors">🚚 Delivery Time</button>
              <button onClick={() => handleOptionClick('Cash on delivery available hai?', 'cod')} className="text-[10px] bg-white text-[#173D2E] border border-[#173D2E]/20 px-2.5 py-1 rounded-full font-medium hover:bg-[#173D2E] hover:text-[#F5F1E6] transition-colors">💵 COD Available</button>
              <button onClick={() => handleOptionClick('Return policy kya hai?', 'returns')} className="text-[10px] bg-white text-[#173D2E] border border-[#173D2E]/20 px-2.5 py-1 rounded-full font-medium hover:bg-[#173D2E] hover:text-[#F5F1E6] transition-colors">🔄 Return Policy</button>
            </div>
            <form onSubmit={handleSendMessage} className="flex shrink-0 gap-2 border-t border-[#BF9F62]/20 bg-[#F5F1E6] p-3">
              <input type="text" placeholder="Ask a question..." value={userQuery} onChange={(e) => setUserQuery(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#BF9F62]/30 bg-white px-3 py-2.5 text-xs text-[#173D2E] outline-none focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/15" />
              <button type="submit" className="bg-[#173D2E] text-[#F5F1E6] p-2 rounded-xl text-xs font-bold hover:bg-[#235843] flex items-center justify-center"><Send className="w-3.5 h-3.5" /></button>
            </form>
          </div>
        )}
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#BF9F62] bg-[#173D2E] text-[#BF9F62] shadow-2xl transition-all hover:scale-105">
          {isChatOpen ? <X className="w-6 h-6 text-[#F5F1E6]" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>

      {/* EMAIL NEWSLETTER MODAL */}
      {isNewsletterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#F5F1E6] border border-[#173D2E]/20 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl">
            <button onClick={closeNewsletter} className="absolute top-4 right-4 p-1 rounded-lg text-[#173D2E]/60 hover:text-[#173D2E]"><X className="w-5 h-5" /></button>
            {newsletterSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-[#173D2E] text-[#BF9F62] rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                <h3 className="text-xl font-extrabold text-[#173D2E]">You're Subscribed!</h3>
                <p className="text-xs text-[#173D2E]/70 max-w-xs mx-auto">Thank you for joining Bazaar Retail. You will be the first to receive exclusive discounts!</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-4 text-center">
                <div className="w-12 h-12 bg-[#BF9F62]/20 border border-[#BF9F62]/40 text-[#173D2E] rounded-2xl flex items-center justify-center mx-auto mb-2"><Mail className="w-6 h-6 text-[#173D2E]" /></div>
                <div>
                  <span className="text-[10px] font-bold text-[#BF9F62] uppercase tracking-widest bg-[#173D2E] px-2.5 py-0.5 rounded-full">Exclusive Deals</span>
                  <h3 className="text-2xl font-black text-[#173D2E] mt-2">Get Special Offers!</h3>
                  <p className="text-xs text-[#173D2E]/75 mt-1">Subscribe to our newsletter for exclusive Pakistani sales, new arrivals, and discount codes.</p>
                </div>
                <div className="space-y-3 pt-2">
                  <input type="email" required placeholder="Enter your email address..." value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)} className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl px-4 py-3 text-sm text-[#173D2E] placeholder-[#173D2E]/50 focus:outline-none focus:border-[#BF9F62]" />
                  <button type="submit" disabled={isSubmittingNewsletter} className="w-full bg-[#173D2E] hover:bg-[#235843] text-[#F5F1E6] font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                    {isSubmittingNewsletter ? <><Loader2 className="w-4 h-4 animate-spin" /> Subscribing...</> : 'Subscribe Now'}
                  </button>
                </div>
                <button type="button" onClick={closeNewsletter} className="text-xs text-[#173D2E]/50 hover:underline pt-2 block mx-auto">Skip for now</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#071A13]/70 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col justify-between border-l border-[#BF9F62]/30 bg-[#F5F1E6] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#BF9F62]/20 bg-white px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#173D2E]" /><h2 className="font-serif text-2xl font-semibold text-[#173D2E]">Your Cart</h2></div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 rounded-lg text-[#173D2E]/60 hover:text-[#173D2E] hover:bg-[#EFEAE0]"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-[#173D2E]/50"><ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40 text-[#173D2E]" /><p>Your shopping cart is empty.</p></div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#BF9F62]/20 bg-white p-3 shadow-sm sm:gap-4">
                    <img src={item.image || 'https://via.placeholder.com/100'} alt={item.name} className="h-20 w-20 shrink-0 rounded-xl bg-[#E5DEC3] object-contain p-1" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#173D2E] truncate">{item.name}</h4>
                      <p className="text-xs text-[#173D2E] font-bold mt-0.5">Rs. {Number(item.price || 0).toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#BF9F62]/30 bg-[#F5F1E6] text-[#173D2E] transition-colors hover:bg-[#173D2E] hover:text-white"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold text-[#173D2E]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#BF9F62]/30 bg-[#F5F1E6] text-[#173D2E] transition-colors hover:bg-[#173D2E] hover:text-white"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-[#173D2E]/50 hover:text-rose-600 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="space-y-4 border-t border-[#BF9F62]/25 bg-white p-5 sm:p-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#173D2E]/70 font-medium"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#173D2E]/70 font-medium"><span>Shipping Fee</span><span>Rs. {shippingFee}</span></div>
                  <div className="flex justify-between text-base font-bold text-[#173D2E] pt-2 border-t border-[#173D2E]/15"><span>Total Amount</span><span className="text-[#173D2E]">Rs. {grandTotal.toLocaleString()}</span></div>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full rounded-full bg-[#173D2E] py-3.5 text-sm font-bold text-[#F5F1E6] shadow-md ring-1 ring-[#BF9F62]/30 transition-all hover:bg-[#235843] hover:shadow-lg">Proceed to Checkout (COD)</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL WITH DYNAMIC CITIES DROPDOWN */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071A13]/75 p-3 backdrop-blur-md sm:p-6">
          <div className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-[#BF9F62]/30 bg-[#F5F1E6] p-5 shadow-2xl sm:p-8">
            <button onClick={() => { setIsCheckoutOpen(false); setOrderSubmitted(false); }} className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-[#173D2E] shadow-sm transition-colors hover:bg-[#173D2E] hover:text-white"><X className="w-5 h-5" /></button>
            {orderSubmitted ? (
              <div className="text-center py-8 space-y-5">
                <div className="w-16 h-16 bg-[#173D2E]/10 border border-[#173D2E]/30 text-[#173D2E] rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                <h3 className="text-2xl font-bold text-[#173D2E]">{isTestOrder ? 'TEST ORDER SUCCESSFUL' : 'Order Confirmed!'}</h3>
                <p className="text-[#173D2E]/75 text-sm max-w-sm mx-auto">{isTestOrder ? 'Test order validated and saved in Supabase. No real HHC supplier order was placed. No delivery will occur.' : 'Your order has been successfully placed. Our representative will contact you shortly.'}</p>
                <button onClick={() => { setIsCheckoutOpen(false); setOrderSubmitted(false); }} className="mt-4 bg-[#173D2E] hover:bg-[#235843] text-[#F5F1E6] px-6 py-2.5 rounded-xl font-semibold text-sm">Continue Shopping</button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-5">
                <div>
                  <h2 className="pr-10 font-serif text-2xl font-semibold text-[#173D2E] sm:text-3xl">Cash on Delivery Checkout</h2>
                  <p className="text-xs text-[#173D2E]/70 mt-1">Provide complete delivery details for shipping.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#173D2E] block mb-1">Full Name</label>
                    <input type="text" required placeholder="e.g. Ali Ahmed" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-[#BF9F62]/20 bg-white px-3.5 py-2.5 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/15" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#173D2E] block mb-1">WhatsApp / Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#173D2E]/60" />
                      <input type="tel" required placeholder="0300 1234567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-xl border border-[#BF9F62]/20 bg-white pl-9 pr-3.5 py-2.5 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/15" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#173D2E] block mb-1">City (Service Area)</label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#173D2E]/60" />
                        {cities.length > 0 ? (
                          <select required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full rounded-xl border border-[#BF9F62]/20 bg-white pl-9 pr-3.5 py-2.5 text-sm text-[#173D2E] appearance-none cursor-pointer focus:outline-none focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/15">
                            <option value="" disabled>Select City...</option>
                            {cities.map(c => (
                              <option key={c.id} value={c.id}>{c.cityName}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" required placeholder="City Name" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full rounded-xl border border-[#BF9F62]/20 bg-white pl-9 pr-3.5 py-2.5 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/15" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#173D2E] block mb-1">Shipping Fee</label>
                      <div className="rounded-xl border border-[#BF9F62]/20 bg-white px-3.5 py-2.5 text-sm font-bold text-[#173D2E]">Rs. {shippingFee}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#173D2E] block mb-1">Full Delivery Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#173D2E]/60" />
                      <textarea required rows="2" placeholder="House #, Street #, Sector / Area..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full rounded-xl border border-[#BF9F62]/20 bg-white pl-9 pr-3.5 py-2 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62] focus:ring-2 focus:ring-[#BF9F62]/15"></textarea>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 border-t border-[#BF9F62]/25 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs text-[#173D2E]/60 block">Total Payable</span>
                    <span className="text-2xl font-extrabold text-[#173D2E]">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173D2E] px-6 py-3.5 text-sm font-bold text-[#F5F1E6] shadow-md transition-all hover:bg-[#235843] hover:shadow-lg disabled:opacity-50 sm:w-auto">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing...</> : 'Confirm Order (COD)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}