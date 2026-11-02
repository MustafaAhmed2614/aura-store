import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Star,
  Heart,
  X,
  Plus,
  Minus,
  Check,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  Eye,
  Trash2,
  Package,
  Sparkles,
  SlidersHorizontal,
  CreditCard,
  Lock,
  CheckCircle2,
  ChevronRight,
  Store
} from 'lucide-react';

// --- INITIAL DROPSHIPPING PRODUCTS CATALOG ---
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'AURA CyberPulse RGB Wireless Headphones',
    category: 'Electronics',
    price: 129.99,
    originalPrice: 199.99,
    rating: 4.9,
    reviewsCount: 328,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    tag: 'Best Seller',
    stock: 14,
    description: 'Next-gen spatial audio headphones with dynamic active noise cancellation, custom RGB lighting rings, and ultra-low latency bluetooth 5.3 connection.',
    colors: ['Neon Blue', 'Matte Black', 'Cyber Violet'],
    supplier: 'TechNova Overseas Ltd.'
  },
  {
    id: 'prod-2',
    name: 'Luminary Ambient Sunset Smart Lamp',
    category: 'Home & Living',
    price: 49.99,
    originalPrice: 79.99,
    rating: 4.7,
    reviewsCount: 194,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
    tag: 'Trending',
    stock: 8,
    description: 'Transform your room vibes with 16-million customizable spectrum colors controlled via app, music rhythm sync, and smart voice assistant compatibility.',
    colors: ['Golden Hour', 'Aurora Neon', 'Deep Cosmos'],
    supplier: 'AuraHome Direct'
  },
  {
    id: 'prod-3',
    name: 'ChronoMax Minimalist Smart OLED Watch',
    category: 'Smart Tech',
    price: 89.95,
    originalPrice: 149.00,
    rating: 4.8,
    reviewsCount: 412,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    tag: '20% OFF',
    stock: 23,
    description: 'Aerospace-grade titanium frame with continuous biometric tracking, 14-day battery life, and waterproof sapphire glass display.',
    colors: ['Titanium Gray', 'Obsidian Black'],
    supplier: 'Zenith Global Supply'
  },
  {
    id: 'prod-4',
    name: 'SonicPro ANC Hi-Fi Wireless Earbuds',
    category: 'Electronics',
    price: 64.99,
    originalPrice: 119.99,
    rating: 4.6,
    reviewsCount: 156,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
    tag: 'Hot Deal',
    stock: 5,
    description: 'Crystal clear studio audio tuning with quad-microphone crystal voice call technology and compact wireless charging case.',
    colors: ['Pure Pearl White', 'Midnight Blue'],
    supplier: 'TechNova Overseas Ltd.'
  },
  {
    id: 'prod-5',
    name: 'ErgoLeather Smart Desk Pad & Wireless Charger',
    category: 'Home & Living',
    price: 39.99,
    originalPrice: 69.99,
    rating: 4.5,
    reviewsCount: 88,
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&auto=format&fit=crop&q=80',
    tag: 'New',
    stock: 30,
    description: 'Waterproof vegan leather desk mat featuring built-in 15W fast magnetic wireless charging zone for phones and earbuds.',
    colors: ['Caramel Brown', 'Charcoal Gray'],
    supplier: 'DeskCrafted Co.'
  },
  {
    id: 'prod-6',
    name: 'Vortex RGB Low-Profile Mechanical Keyboard',
    category: 'Smart Tech',
    price: 109.00,
    originalPrice: 159.00,
    rating: 4.9,
    reviewsCount: 520,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    tag: 'Top Rated',
    stock: 12,
    description: 'Hot-swappable tactile switches, ultra-thin CNC aluminum housing, and multi-device seamless Bluetooth / 2.4G wireless switching.',
    colors: ['Cyberpunk Edition', 'Minimal Slate'],
    supplier: 'Vortex Tech Direct'
  },
  {
    id: 'prod-7',
    name: 'ThermoSmart Precision Mug Warm Control',
    category: 'Home & Living',
    price: 54.50,
    originalPrice: 85.00,
    rating: 4.7,
    reviewsCount: 92,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    tag: 'Popular',
    stock: 19,
    description: 'Keep your coffee or tea at your exact preferred temperature all day long with app heat monitoring and coaster charging dock.',
    colors: ['Matte White', 'Piano Black'],
    supplier: 'AuraHome Direct'
  },
  {
    id: 'prod-8',
    name: 'AeroShield LED Futuristic Anti-Theft Backpack',
    category: 'Apparel',
    price: 94.99,
    originalPrice: 139.99,
    rating: 4.8,
    reviewsCount: 204,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    tag: 'Dropship Special',
    stock: 7,
    description: 'Water-resistant hardshell backpack with integrated programmable LED display, TSA combo lock, and built-in USB power port.',
    colors: ['Stealth Black', 'Carbon Gray'],
    supplier: 'UrbanGear Express'
  }
];

export default function App() {
  // --- STATE MANAGEMENT ---
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('aura_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('aura_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState(200);
  const [sortBy, setSortBy] = useState('popular');

  // UI Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Shipping, 2: Payment, 3: Confirmation
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // Percentage

  // Checkout Form State
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    country: 'United States',
    paymentMethod: 'cod' // 'cod' or 'card'
  });

  // Unique Order Tracking Number state (Generated on submit to keep render pure)
  const [orderTrackingNumber, setOrderTrackingNumber] = useState('');

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('aura_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
  }, [cart]);

  // Toast Notification Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Cart Handlers
  const addToCart = (product, color = null) => {
    const selectedColor = color || (product.colors ? product.colors[0] : 'Default');
    const existingIndex = cart.findIndex(
      (item) => item.id === product.id && item.selectedColor === selectedColor
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, quantity: 1, selectedColor }]);
    }
    showToast(`Added "${product.name}" to cart!`);
  };

  const updateQuantity = (id, color, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id && item.selectedColor === color) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id, color) => {
    setCart(cart.filter((item) => !(item.id === id && item.selectedColor === color)));
    showToast('Item removed from cart.');
  };

  const toggleWishlist = (productId) => {
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter((id) => id !== productId));
      showToast('Removed from wishlist');
    } else {
      setWishlist([...wishlist, productId]);
      showToast('Added to wishlist!');
    }
  };

  // Promo Code Validation
  const handleApplyPromo = () => {
    if (promoInput.trim().toUpperCase() === 'AURA10') {
      setAppliedDiscount(10);
      showToast('Promo applied: 10% Discount!');
    } else if (promoInput.trim().toUpperCase() === 'DISCOUNT20') {
      setAppliedDiscount(20);
      showToast('Promo applied: 20% Discount!');
    } else {
      showToast('Invalid Promo Code (Try AURA10)');
    }
  };

  // Price Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (cartSubtotal * appliedDiscount) / 100;
  }, [cartSubtotal, appliedDiscount]);

  const shippingCost = cartSubtotal > 100 || cart.length === 0 ? 0 : 9.99;
  const cartTotal = cartSubtotal - discountAmount + (cart.length > 0 ? shippingCost : 0);

  const totalCartBadgeCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Categories list
  const categories = ['All', 'Electronics', 'Smart Tech', 'Home & Living', 'Apparel'];

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPrice = p.price <= priceRange;
        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.reviewsCount - a.reviewsCount; // default 'popular'
      });
  }, [products, selectedCategory, searchQuery, priceRange, sortBy]);

  // Admin Supplier Add Product Handler
  const handleAddProduct = (newProd) => {
    const createdProduct = {
      ...newProd,
      id: `prod-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 1,
      price: parseFloat(newProd.price),
      originalPrice: parseFloat(newProd.originalPrice || newProd.price * 1.3),
      colors: newProd.colors.split(',').map((c) => c.trim())
    };
    setProducts([createdProduct, ...products]);
    setIsAdminOpen(false);
    showToast('New dropshipping item published to store!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* --- TOAST NOTIFICATION --- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-400/40 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedCategory('All')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                AURA
              </span>
              <span className="text-xs tracking-widest text-indigo-400 uppercase font-semibold block -mt-1">
                Trends
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search trending products, electronics, smart gear..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-full pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Actions Right */}
          <div className="flex items-center gap-3">
            {/* Supplier Portal Trigger */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="hidden lg:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl border border-slate-700 font-medium transition"
              title="Add product as dropshipping supplier"
            >
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Supplier Portal</span>
            </button>

            {/* Wishlist indicator */}
            <div className="relative">
              <button
                onClick={() => showToast(`Wishlist contains ${wishlist.length} item(s)`)}
                className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition"
              >
                <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold text-sm hidden sm:inline">Cart</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {totalCartBadgeCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </nav>

      {/* --- HERO BANNER SECTION --- */}
      <section className="relative overflow-hidden my-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs px-3.5 py-1.5 rounded-full font-semibold mb-4">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Next-Day Global Express Dropshipping</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight mb-4">
                Discover Next-Gen <br />
                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  Smart Lifestyle Products
                </span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mb-6 max-w-lg leading-relaxed">
                Handpicked premium trending gadgets, smart home tech & modern essentials directly from verified worldwide suppliers with guaranteed quality.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#catalog"
                  className="bg-white hover:bg-slate-100 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
                >
                  Shop Catalog Now
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    const topProduct = products[0];
                    if (topProduct) setQuickViewProduct(topProduct);
                  }}
                  className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold px-5 py-3 rounded-xl transition text-sm flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Featured Highlight
                </button>
              </div>
            </div>

            {/* Banner Graphic/Card */}
            <div className="relative flex justify-center">
              <div className="relative group w-full max-w-md">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 p-4">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
                    alt="Hero Showcase"
                    className="w-full h-64 object-cover rounded-xl transform group-hover:scale-105 transition duration-500"
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                        Featured Drop
                      </span>
                      <h4 className="text-white font-bold text-base">AURA CyberPulse RGB ANC</h4>
                    </div>
                    <span className="bg-indigo-600 text-white font-black px-3 py-1 rounded-lg text-sm">
                      $129.99
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRUST BADGES BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <Truck className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-white">Free Fast Shipping</h5>
              <p className="text-[11px] text-slate-400">On orders over $100</p>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-white">Buyer Protection</h5>
              <p className="text-[11px] text-slate-400">30-day money back</p>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <RotateCcw className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-white">Easy Returns</h5>
              <p className="text-[11px] text-slate-400">Hassle-free process</p>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <Lock className="w-6 h-6 text-violet-400 shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-white">Encrypted Checkout</h5>
              <p className="text-[11px] text-slate-400">100% secure payments</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- MAIN CATALOG & FILTERS --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="catalog">
        {/* Filter Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>Explore Products</span>
              <span className="text-xs bg-slate-800 text-indigo-400 px-2.5 py-1 rounded-full font-semibold border border-slate-700">
                {filteredProducts.length} items
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Top curated items ready for fast dispatch
            </p>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Bar (Price & Sort) */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <div className="flex items-center gap-3 w-full md:w-64">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                Max Price: <strong className="text-white">${priceRange}</strong>
              </span>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-400 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* PRODUCT GRID */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No products found</h3>
            <p className="text-slate-400 text-xs mb-4">
              Try tweaking your search query or price filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setPriceRange(200);
              }}
              className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-500 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isWishlisted = wishlist.includes(product.id);
              return (
                <div
                  key={product.id}
                  className="group bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
                >
                  {/* Card Header & Image */}
                  <div className="relative aspect-square overflow-hidden bg-slate-950">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {/* Tag Badge */}
                    {product.tag && (
                      <span className="absolute top-3 left-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-md tracking-wider">
                        {product.tag}
                      </span>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/60 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/50 transition"
                    >
                      <Heart
                        className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                    </button>

                    {/* Quick View Trigger Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        className="bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition"
                      >
                        <Eye className="w-4 h-4 text-indigo-400" />
                        Quick Specs
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>{product.category}</span>
                        <div className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{product.rating}</span>
                          <span className="text-slate-500">({product.reviewsCount})</span>
                        </div>
                      </div>

                      <h3 className="text-white font-bold text-sm line-clamp-1 mb-2 group-hover:text-indigo-400 transition">
                        {product.name}
                      </h3>
                    </div>

                    <div>
                      {/* Price & Stock */}
                      <div className="flex items-center justify-between mt-3 mb-4">
                        <div>
                          <span className="text-lg font-black text-white">${product.price.toFixed(2)}</span>
                          {product.originalPrice > product.price && (
                            <span className="text-xs text-slate-500 line-through ml-2">
                              ${product.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium border border-emerald-500/20">
                          {product.stock} left
                        </span>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold text-xs py-2.5 rounded-xl border border-slate-700 hover:border-indigo-500 transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add To Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- QUICK VIEW MODAL --- */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="h-64 sm:h-full bg-slate-950 relative">
                <img
                  src={quickViewProduct.image}
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {quickViewProduct.category}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1 mb-2">
                    {quickViewProduct.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <div className="flex items-center text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="font-bold ml-1">{quickViewProduct.rating}</span>
                    </div>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{quickViewProduct.reviewsCount} verified reviews</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {quickViewProduct.description}
                  </p>

                  <div className="text-xs text-slate-400 mb-4 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                    <span>Fulfilled & Verified by: </span>
                    <strong className="text-slate-200">{quickViewProduct.supplier}</strong>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-white">
                      ${quickViewProduct.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      In Stock ({quickViewProduct.stock})
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Instant Add To Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SLIDE-OUT CART DRAWER --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col justify-between p-6 shadow-2xl relative">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Your Cart</h3>
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {totalCartBadgeCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free Shipping Progress bar */}
              <div className="mb-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">
                    {cartSubtotal >= 100 ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Free Express Shipping Unlocked!
                      </span>
                    ) : (
                      `Add $${(100 - cartSubtotal).toFixed(2)} more for Free Shipping`
                    )}
                  </span>
                  <span className="text-slate-400 font-bold">
                    {Math.min(100, Math.round((cartSubtotal / 100) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (cartSubtotal / 100) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Your shopping bag is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.id}-${item.selectedColor}`}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex gap-3 items-center"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg bg-slate-900 shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.name}</h4>
                      <p className="text-[11px] text-slate-400">Color: {item.selectedColor}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-white">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        {/* Qty Controls */}
                        <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900">
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedColor, -1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedColor, 1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id, item.selectedColor)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer / Checkout Summary */}
            <div className="pt-4 border-t border-slate-800">
              {/* Promo Code Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Promo (e.g. AURA10)"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleApplyPromo}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl font-semibold border border-slate-700 transition"
                >
                  Apply
                </button>
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-200 font-medium">${cartSubtotal.toFixed(2)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({appliedDiscount}%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span className="text-slate-200 font-medium">
                    {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-indigo-400">${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                  setCheckoutStep(1);
                }}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm"
              >
                Proceed To Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CHECKOUT MODAL FLOW --- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative p-6">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stepper Progress */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  checkoutStep >= 1 ? 'text-indigo-400' : 'text-slate-600'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                  1
                </span>
                Shipping
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  checkoutStep >= 2 ? 'text-indigo-400' : 'text-slate-600'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">
                  2
                </span>
                Payment
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  checkoutStep === 3 ? 'text-emerald-400' : 'text-slate-600'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">
                  3
                </span>
                Confirm
              </div>
            </div>

            {/* STEP 1: SHIPPING FORM */}
            {checkoutStep === 1 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Shipping Destination</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={shippingInfo.fullName}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="123 Luxury Ave, Suite 400"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">City</label>
                      <input
                        type="text"
                        placeholder="New York"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Zip Code</label>
                      <input
                        type="text"
                        placeholder="10001"
                        value={shippingInfo.zip}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, zip: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  disabled={!shippingInfo.fullName || !shippingInfo.address}
                  onClick={() => setCheckoutStep(2)}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
                >
                  Continue To Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: PAYMENT METHOD */}
            {checkoutStep === 2 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Select Payment Method</h3>
                <div className="space-y-3 mb-6">
                  {/* COD Option */}
                  <label
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'cod' })}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                      shippingInfo.paymentMethod === 'cod'
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800 bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Cash on Delivery (COD)</h4>
                        <p className="text-[11px] text-slate-400">Pay upon package arrival at door</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="pay"
                      checked={shippingInfo.paymentMethod === 'cod'}
                      readOnly
                      className="accent-indigo-500"
                    />
                  </label>

                  {/* Card Option */}
                  <label
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'card' })}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                      shippingInfo.paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800 bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Credit / Debit Card (Simulated)</h4>
                        <p className="text-[11px] text-slate-400">Instant encrypted clearance</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="pay"
                      checked={shippingInfo.paymentMethod === 'card'}
                      readOnly
                      className="accent-indigo-500"
                    />
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCheckoutStep(1)}
                    className="w-1/3 bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl text-xs"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      const generatedId = `AUR-${Math.floor(100000 + Math.random() * 900000)}`;
                      setOrderTrackingNumber(generatedId);
                      setCheckoutStep(3);
                      setCart([]);
                    }}
                    className="w-2/3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                  >
                    Complete Order (${cartTotal.toFixed(2)})
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: ORDER CONFIRMATION */}
            {checkoutStep === 3 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Order Confirmed!</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Thank you, <strong className="text-white">{shippingInfo.fullName}</strong>. Your tracking number is{' '}
                  <span className="text-indigo-400 font-mono">#{orderTrackingNumber}</span>.
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ship To:</span>
                    <span className="text-slate-200">{shippingInfo.address}, {shippingInfo.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment:</span>
                    <span className="text-emerald-400 uppercase font-semibold">{shippingInfo.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-indigo-400 font-semibold">Dispatched to Supplier</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition"
                >
                  Return to Store
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUPPLIER / ADMIN ADD PRODUCT MODAL --- */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAdminOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Add Dropshipping Inventory</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Simulate adding new products directly from AliExpress / CJ Dropshipping suppliers.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleAddProduct({
                  name: formData.get('name'),
                  category: formData.get('category'),
                  price: formData.get('price'),
                  originalPrice: formData.get('originalPrice'),
                  image: formData.get('image'),
                  stock: Number(formData.get('stock')),
                  description: formData.get('description'),
                  colors: formData.get('colors') || 'Standard',
                  supplier: formData.get('supplier') || 'Global Direct'
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1">Product Name</label>
                <input
                  required
                  name="name"
                  type="text"
                  placeholder="e.g. Ultra Smart LED Ring Light"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Category</label>
                  <select
                    name="category"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Smart Tech">Smart Tech</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Apparel">Apparel</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Stock Qty</label>
                  <input
                    required
                    name="stock"
                    type="number"
                    defaultValue="15"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Selling Price ($)</label>
                  <input
                    required
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="49.99"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Original MSRP ($)</label>
                  <input
                    name="originalPrice"
                    type="number"
                    step="0.01"
                    placeholder="79.99"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Unsplash Image URL</label>
                <input
                  required
                  name="image"
                  type="url"
                  defaultValue="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <textarea
                  name="description"
                  rows="2"
                  placeholder="Key product features..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition mt-2 shadow-lg shadow-emerald-600/20"
              >
                Publish To Storefront
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="mt-20 border-t border-slate-800 bg-slate-950 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-white tracking-wider">AURA</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Curating the world's most viral and innovative tech products directly to your doorstep.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Categories</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="hover:text-indigo-400 cursor-pointer" onClick={() => setSelectedCategory('Electronics')}>Electronics</li>
                <li className="hover:text-indigo-400 cursor-pointer" onClick={() => setSelectedCategory('Smart Tech')}>Smart Tech</li>
                <li className="hover:text-indigo-400 cursor-pointer" onClick={() => setSelectedCategory('Home & Living')}>Home & Living</li>
                <li className="hover:text-indigo-400 cursor-pointer" onClick={() => setSelectedCategory('Apparel')}>Apparel & Accessories</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Dropship Partner</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="hover:text-indigo-400 cursor-pointer" onClick={() => setIsAdminOpen(true)}>Supplier Dashboard</li>
                <li className="hover:text-indigo-400 cursor-pointer">Global Logistics</li>
                <li className="hover:text-indigo-400 cursor-pointer">Quality Guarantee</li>
                <li className="hover:text-indigo-400 cursor-pointer">Affiliate Program</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Newsletter</h4>
              <p className="text-xs text-slate-400 mb-3">Get 10% off your first order with code <strong className="text-indigo-400">AURA10</strong></p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none flex-1"
                />
                <button
                  onClick={() => showToast('Subscribed to VIP deals!')}
                  className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-xl font-bold hover:bg-indigo-500"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} AURA Trends Inc. Built with React & Tailwind CSS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}