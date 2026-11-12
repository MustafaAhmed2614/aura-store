import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingCart,
  Search,
  X,
  Plus,
  Minus,
  Sparkles,
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
  Eye
} from 'lucide-react';

// ==========================================
// 1. SUPABASE CLIENT SETUP (FALLBACK & BACKUP)
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default function App() {
  // ==========================================
  // 2. STATE MANAGEMENT
  // ==========================================
  const [products, setProducts] = useState([]);
  const [cities, setCities] = useState([]); // HHC Serviceable Cities
  const [businessProfileId, setBusinessProfileId] = useState(null); // Required for Orders
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
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
    let isMounted = true;

    const loadHhcData = async () => {
      try {
        const baseUrl = 'https://api.hhcdropshipping.com/api';
        const hhcApiKey = import.meta.env.VITE_HHC_API_KEY;

        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BazaarRetail-Integration/1.0' // Required by HHC Firewall
        };

        if (hhcApiKey) {
          headers['app-key'] = hhcApiKey;
        }

        // A. FETCH BUSINESS PROFILE (Needed for placing orders)
        try {
          const bpRes = await fetch(`${baseUrl}/dropshipper/open/businessProfiles`, { headers });
          if (bpRes.ok) {
            const bpData = await bpRes.json();
            if (bpData?.data?.length > 0) {
              const activeBp = bpData.data.find(bp => bp.isVerified) || bpData.data[0];
              if (isMounted) setBusinessProfileId(activeBp.id);
            }
          }
        } catch (e) { console.error('Failed to fetch BP:', e); }

        // B. FETCH SERVICABLE CITIES FOR CHECKOUT DROPDOWN
        try {
          const citiesRes = await fetch(`${baseUrl}/dropshipper/open/courier_cities`, { headers });
          if (citiesRes.ok) {
            const citiesData = await citiesRes.json();
            if (Array.isArray(citiesData) && isMounted) {
              setCities(citiesData);
            }
          }
        } catch (e) { console.error('Failed to fetch cities:', e); }

        // C. FETCH PRODUCTS
        const productsRes = await fetch(`${baseUrl}/dropshipper/open/products?paginate=100`, { headers });
        if (!productsRes.ok) throw new Error(`HHC Products API Error: ${productsRes.status}`);
        
        const productsData = await productsRes.json();
        const productsList = productsData.data || [];

        // Universal Image Extractor
        const extractImage = (item) => {
          if (!item) return '';
          if (item.product_thumbnail) return item.product_thumbnail;
          const directKeys = [item.featured_image, item.main_image, item.image, item.image_url];
          for (const img of directKeys) {
            if (typeof img === 'string' && img.trim().startsWith('http')) return img.trim();
          }
          if (Array.isArray(item.product_galleries) && item.product_galleries.length > 0) {
             return item.product_galleries[0];
          }
          return 'https://via.placeholder.com/400x400?text=No+Image';
        };

        // CUSTOM PRICING & CATEGORIES OVERRIDE
        const customPrices = {
          186: 1450,
          996: 1890,
        };

        const customCategories = {
          186: 'Health & Personal Care',
          996: 'Electronics & Gadgets',
        };
        
        const formattedProducts = productsList.map((item) => {
          const cleanDescription = item.description 
            ? item.description.replace(/<[^>]*>?/gm, '') 
            : 'Premium quality guaranteed by Bazaar Retail.';
          const wholesaleCost = Number(item.salePrice || item.wholesalePrice || item.price || 0);
          
          // Pricing Strategy: Custom Price pehle check hogi, warna Wholesale Cost + Rs. 300 Profit
          const finalPrice = customPrices[item.id] !== undefined 
            ? customPrices[item.id] 
            : (wholesaleCost > 0 ? wholesaleCost + 300 : 999);

          const categoryName = customCategories[item.id] || (item.categories && item.categories.length > 0 ? item.categories[0].name : 'General');

          return {
            id: item.id,
            name: item.name || item.title || 'Product',
            price: finalPrice,
            costPrice: wholesaleCost,
            image: extractImage(item),
            category: categoryName,
            description: cleanDescription,
            stockQuantity: item.quantity || 0
          };
        });

        // WISHLIST FILTERING (Restored your specific products filter)
        const wishlistKeywords = ['rvdu', 'ip67', 'visual ear', 'massage gel'];
        const wishlistOnly = formattedProducts.filter(p => 
          wishlistKeywords.some(keyword => p.name.toLowerCase().includes(keyword))
        );

        const finalProducts = wishlistOnly.length > 0 ? wishlistOnly : formattedProducts;

        if (isMounted) {
          setProducts(finalProducts);
        }

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
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) return prevCart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (id) => setCart((prevCart) => prevCart.filter((item) => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal === 0 ? 0 : 250;
  const grandTotal = subtotal + shippingFee;

  // HHC AUTO-ORDER PLACEMENT LOGIC
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.city || !formData.address) {
      return alert('Please complete all delivery fields.');
    }

    setIsSubmitting(true);
    let orderSuccess = false;
    let hhcOrderId = null;

    // 1. Attempt HHC Auto-Placement
    try {
      const baseUrl = 'https://api.hhcdropshipping.com/api';
      const hhcApiKey = import.meta.env.VITE_HHC_API_KEY;
      
      if (hhcApiKey && businessProfileId) {
        const orderPayload = {
          products: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
          full_name: formData.name,
          address: formData.address,
          destination_city: formData.city, // Composite ID (e.g. "2-105") from dropdown
          phone: formData.phone,
          bp_id: businessProfileId,
          shp_type: 1, // Regular Shipment
          payment_method: "cod",
          sell_price: grandTotal
        };

        const response = await fetch(`${baseUrl}/dropshipper/open/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'app-key': hhcApiKey,
            'User-Agent': 'BazaarRetail-Integration/1.0'
          },
          body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
            const responseData = await response.json();
            orderSuccess = true;
            hhcOrderId = responseData.id || null;
        }
      }
    } catch (err) {
      console.error('HHC Auto-Placement failed:', err);
    }

    // 2. Fallback / Backup to Supabase
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').insert([{
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_city: formData.city, 
          customer_address: formData.address,
          items: cart,
          total_amount: grandTotal,
          status: orderSuccess ? `Auto-Placed on HHC (ID: ${hhcOrderId})` : 'Pending COD (Manual Required)'
        }]);
        if (!error && !orderSuccess) orderSuccess = true; // Supabase saved it as backup
      } catch (err) { console.error('Supabase backup failed', err); }
    }

    if (orderSuccess) {
      setOrderSubmitted(true);
      setCart([]);
    } else {
      alert('Failed to place order. Please try again or check your internet connection.');
    }
    setIsSubmitting(false);
  };

  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ==========================================
  // 5. MAIN UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#173D2E] font-sans flex flex-col justify-between">
      <div>
        {/* NAVBAR HEADER */}
        <nav className="sticky top-0 z-40 bg-[#F5F1E6]/95 backdrop-blur-md border-b border-[#173D2E]/15 px-4 lg:px-8 py-3.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-[#EFEAE0] text-[#173D2E] hover:bg-[#E5DEC3]"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => navigateTo('home')}
              >
                <div className="w-10 h-10 rounded-xl bg-[#173D2E] flex items-center justify-center shadow-md">
                  <span className="font-extrabold text-[#BF9F62] tracking-tight text-lg">BR</span>
                </div>
                <span className="text-xl font-black text-[#173D2E] tracking-wider">
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

            <div className="flex items-center gap-3">
              {currentPage === 'home' && (
                <div className="relative hidden md:block w-60">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#173D2E]/60" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#173D2E] placeholder-[#173D2E]/50 focus:outline-none focus:border-[#BF9F62]"
                  />
                </div>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl bg-[#EFEAE0] border border-[#173D2E]/20 hover:bg-[#E5DEC3] text-[#173D2E] transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#BF9F62] text-[#173D2E] text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {cart.reduce((a, c) => a + c.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-[#173D2E]/15 flex flex-col space-y-2 text-sm font-semibold text-[#173D2E]">
              <button onClick={() => navigateTo('home')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">Store / All Products</button>
              <button onClick={() => navigateTo('about')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">About Us</button>
              <button onClick={() => navigateTo('shipping')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">Shipping & Delivery</button>
              <button onClick={() => navigateTo('returns')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">Returns Policy</button>
              <button onClick={() => navigateTo('faq')} className="text-left px-3 py-2 rounded-lg hover:bg-[#EFEAE0]">FAQ & Support</button>
            </div>
          )}
        </nav>

        {/* PAGE 1: HOME STORE FRONT */}
        {currentPage === 'home' && (
          <div>
            {/* HERO BANNER SECTION */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#BF9F62]/20 via-[#EFEAE0]/50 to-transparent py-12 px-4 border-b border-[#173D2E]/10">
              <div className="max-w-4xl mx-auto text-center space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#173D2E]/10 border border-[#173D2E]/20 text-[#173D2E] text-xs font-bold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-[#BF9F62]" /> Online Shopping in Pakistan
                </span>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#173D2E]">
                  BAZAARRETAIL - Online Shopping in Pakistan with <span className="text-[#9E7E38]">Cash on Delivery</span>
                </h1>
                <p className="text-[#173D2E]/80 text-sm sm:text-base max-w-2xl mx-auto font-medium">
                  Everyday essentials and smart finds, delivered to your door anywhere in Pakistan. Check the product, then pay in cash when it arrives.
                </p>
              </div>
            </section>

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
            <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-8">
              <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#173D2E] text-[#F5F1E6] font-bold shadow-md'
                        : 'bg-[#EFEAE0] border border-[#173D2E]/15 text-[#173D2E]/80 hover:bg-[#E5DEC3]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="w-10 h-10 text-[#BF9F62] animate-spin" />
                  <p className="text-[#173D2E]/70 text-sm font-medium">Loading Bazaar Retail catalog...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-[#EFEAE0]/60 rounded-3xl border border-[#173D2E]/15 my-8">
                  <ShoppingBag className="w-12 h-12 text-[#173D2E]/40 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[#173D2E]">No products found</h3>
                  <p className="text-[#173D2E]/60 text-sm mt-1">Try adjusting your search or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-[#EFEAE0]/80 rounded-2xl border border-[#173D2E]/15 hover:border-[#BF9F62] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="relative aspect-square overflow-hidden bg-[#E5DEC3]">
                        <img
                          src={product.image || 'https://via.placeholder.com/400x400?text=No+Image'}
                          alt={product.name || 'Product'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {product.category && (
                          <span className="absolute top-3 left-3 bg-[#173D2E] text-[#F5F1E6] text-xs font-semibold px-2.5 py-1 rounded-lg">
                            {product.category}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-[#173D2E] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg">
                            <Eye className="w-4 h-4" /> View Details
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="font-bold text-[#173D2E] group-hover:text-[#9E7E38] transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-[#173D2E]/70 text-xs line-clamp-2 mt-1">
                            {product.description || 'Premium quality guaranteed by Bazaar Retail.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#173D2E]/15">
                          <div>
                            <span className="text-xs text-[#173D2E]/60 block font-medium">Price</span>
                            <span className="text-xl font-extrabold text-[#173D2E]">
                              Rs. {Number(product.price || 0).toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Stops modal from opening when clicking add
                              addToCart(product);
                            }}
                            className="bg-[#BF9F62] hover:bg-[#A88A52] text-[#173D2E] font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
      <footer className="bg-[#173D2E] text-[#F5F1E6] pt-12 pb-8 border-t border-[#BF9F62]/20 mt-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#BF9F62] text-[#173D2E] flex items-center justify-center font-bold">BR</div>
              <span className="font-black text-lg text-[#F5F1E6]">BAZAAR RETAIL</span>
            </div>
            <p className="text-[#F5F1E6]/70 text-xs">
              Everyday essentials & smart finds delivered nationwide across Pakistan with Cash on Delivery.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#BF9F62] mb-3 text-xs uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-xs text-[#F5F1E6]/80">
              <li><button onClick={() => navigateTo('home')} className="hover:text-[#BF9F62]">Home Store</button></li>
              <li><button onClick={() => navigateTo('about')} className="hover:text-[#BF9F62]">About Us</button></li>
              <li><button onClick={() => navigateTo('shipping')} className="hover:text-[#BF9F62]">Shipping & Delivery</button></li>
              <li><button onClick={() => navigateTo('returns')} className="hover:text-[#BF9F62]">Returns & Refunds</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#BF9F62] mb-3 text-xs uppercase tracking-wider">Customer Support</h4>
            <ul className="space-y-2 text-xs text-[#F5F1E6]/80">
              <li><button onClick={() => navigateTo('faq')} className="hover:text-[#BF9F62]">Frequently Asked Questions</button></li>
              <li><span>Cash on Delivery Available</span></li>
              <li><span>3-7 Days Delivery Across Pakistan</span></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#BF9F62] mb-3 text-xs uppercase tracking-wider">Shopping Guarantee</h4>
            <p className="text-xs text-[#F5F1E6]/70">
              Check your parcel upon delivery. 100% genuine Pakistani dropshipping store.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 border-t border-[#F5F1E6]/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#F5F1E6]/50 gap-4">
          <p>© 2026 BAZAAR RETAIL Pakistan. All Rights Reserved.</p>
          <div className="flex gap-4">
            <button onClick={() => navigateTo('shipping')} className="hover:text-[#F5F1E6]">Shipping</button>
            <button onClick={() => navigateTo('returns')} className="hover:text-[#F5F1E6]">Returns</button>
            <button onClick={() => navigateTo('faq')} className="hover:text-[#F5F1E6]">FAQ</button>
          </div>
        </div>
      </footer>

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#F5F1E6] border border-[#173D2E]/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row max-h-[90vh]">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-[#173D2E]/10 hover:bg-[#173D2E] hover:text-white rounded-full text-[#173D2E] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full md:w-1/2 bg-[#E5DEC3] aspect-square flex items-center justify-center overflow-hidden">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
              <div className="space-y-3">
                <span className="inline-block bg-[#173D2E] text-[#F5F1E6] text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {selectedProduct.category}
                </span>
                <h2 className="text-xl font-black text-[#173D2E]">{selectedProduct.name}</h2>
                <div className="text-2xl font-extrabold text-[#9E7E38]">
                  Rs. {Number(selectedProduct.price).toLocaleString()}
                </div>
                <div className="border-t border-[#173D2E]/15 pt-3">
                  <h4 className="text-xs font-bold text-[#173D2E] uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-xs text-[#173D2E]/80 leading-relaxed max-h-40 overflow-y-auto pr-1">
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
                  className="w-full bg-[#BF9F62] hover:bg-[#A88A52] text-[#173D2E] font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart (Rs. {selectedProduct.price.toLocaleString()})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50">
        {isChatOpen && (
          <div className="mb-4 w-80 sm:w-88 bg-[#F5F1E6] border border-[#173D2E]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[420px] transition-all">
            <div className="bg-[#173D2E] text-[#F5F1E6] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#BF9F62] text-[#173D2E] flex items-center justify-center font-bold text-xs">BR</div>
                <div>
                  <h4 className="font-bold text-sm leading-none">Bazaar Retail Bot</h4>
                  <span className="text-[10px] text-[#BF9F62]">Instant AI Support 24/7</span>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-[#F5F1E6]/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[#EFEAE0]/40">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-[#173D2E] text-[#F5F1E6] rounded-br-none' : 'bg-white text-[#173D2E] border border-[#173D2E]/10 shadow-sm rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 bg-[#EFEAE0] border-t border-[#173D2E]/10 flex flex-wrap gap-1.5">
              <button onClick={() => handleOptionClick('Delivery time kya hai?', 'delivery')} className="text-[10px] bg-white text-[#173D2E] border border-[#173D2E]/20 px-2.5 py-1 rounded-full font-medium hover:bg-[#173D2E] hover:text-[#F5F1E6] transition-colors">🚚 Delivery Time</button>
              <button onClick={() => handleOptionClick('Cash on delivery available hai?', 'cod')} className="text-[10px] bg-white text-[#173D2E] border border-[#173D2E]/20 px-2.5 py-1 rounded-full font-medium hover:bg-[#173D2E] hover:text-[#F5F1E6] transition-colors">💵 COD Available</button>
              <button onClick={() => handleOptionClick('Return policy kya hai?', 'returns')} className="text-[10px] bg-white text-[#173D2E] border border-[#173D2E]/20 px-2.5 py-1 rounded-full font-medium hover:bg-[#173D2E] hover:text-[#F5F1E6] transition-colors">🔄 Return Policy</button>
            </div>
            <form onSubmit={handleSendMessage} className="p-2.5 bg-[#F5F1E6] border-t border-[#173D2E]/10 flex gap-2">
              <input type="text" placeholder="Ask a question..." value={userQuery} onChange={(e) => setUserQuery(e.target.value)} className="flex-1 bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl px-3 py-1.5 text-xs text-[#173D2E] focus:outline-none focus:border-[#BF9F62]" />
              <button type="submit" className="bg-[#173D2E] text-[#F5F1E6] p-2 rounded-xl text-xs font-bold hover:bg-[#235843] flex items-center justify-center"><Send className="w-3.5 h-3.5" /></button>
            </form>
          </div>
        )}
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-14 h-14 bg-[#173D2E] border-2 border-[#BF9F62] text-[#BF9F62] rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all relative">
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#F5F1E6] h-full shadow-2xl flex flex-col justify-between border-l border-[#173D2E]/20">
            <div className="p-5 border-b border-[#173D2E]/15 flex items-center justify-between">
              <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#173D2E]" /><h2 className="text-lg font-bold text-[#173D2E]">Your Cart</h2></div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 rounded-lg text-[#173D2E]/60 hover:text-[#173D2E] hover:bg-[#EFEAE0]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-[#173D2E]/50"><ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40 text-[#173D2E]" /><p>Your shopping cart is empty.</p></div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-[#EFEAE0] border border-[#173D2E]/15 rounded-xl items-center">
                    <img src={item.image || 'https://via.placeholder.com/100'} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-[#E5DEC3]" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#173D2E] truncate">{item.name}</h4>
                      <p className="text-xs text-[#173D2E] font-bold mt-0.5">Rs. {Number(item.price || 0).toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-md bg-[#E5DEC3] flex items-center justify-center text-[#173D2E] hover:bg-[#173D2E] hover:text-[#F5F1E6]"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold text-[#173D2E]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-md bg-[#E5DEC3] flex items-center justify-center text-[#173D2E] hover:bg-[#173D2E] hover:text-[#F5F1E6]"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-[#173D2E]/50 hover:text-rose-600 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-5 border-t border-[#173D2E]/15 space-y-4 bg-[#EFEAE0]">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#173D2E]/70 font-medium"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[#173D2E]/70 font-medium"><span>Shipping Fee</span><span>Rs. {shippingFee}</span></div>
                  <div className="flex justify-between text-base font-bold text-[#173D2E] pt-2 border-t border-[#173D2E]/15"><span>Total Amount</span><span className="text-[#173D2E]">Rs. {grandTotal.toLocaleString()}</span></div>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-[#173D2E] hover:bg-[#235843] text-[#F5F1E6] py-3 rounded-xl font-bold text-sm transition-all shadow-md">Proceed to Checkout (COD)</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL WITH DYNAMIC CITIES DROPDOWN */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#F5F1E6] border border-[#173D2E]/20 rounded-3xl w-full max-w-lg p-6 sm:p-8 relative shadow-2xl">
            <button onClick={() => { setIsCheckoutOpen(false); setOrderSubmitted(false); }} className="absolute top-5 right-5 p-1 rounded-lg text-[#173D2E]/60 hover:text-[#173D2E]"><X className="w-5 h-5" /></button>
            {orderSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-[#173D2E]/10 border border-[#173D2E]/30 text-[#173D2E] rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                <h3 className="text-2xl font-bold text-[#173D2E]">Order Confirmed!</h3>
                <p className="text-[#173D2E]/75 text-sm max-w-sm mx-auto">Your order has been successfully placed. Our representative will contact you shortly.</p>
                <button onClick={() => { setIsCheckoutOpen(false); setOrderSubmitted(false); }} className="mt-4 bg-[#173D2E] hover:bg-[#235843] text-[#F5F1E6] px-6 py-2.5 rounded-xl font-semibold text-sm">Continue Shopping</button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#173D2E]">Cash on Delivery Checkout</h2>
                  <p className="text-xs text-[#173D2E]/70 mt-1">Provide complete delivery details for shipping.</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#173D2E] block mb-1">Full Name</label>
                    <input type="text" required placeholder="e.g. Ali Ahmed" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#173D2E] block mb-1">WhatsApp / Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#173D2E]/60" />
                      <input type="tel" required placeholder="0300 1234567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#173D2E] block mb-1">City (Service Area)</label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#173D2E]/60" />
                        {cities.length > 0 ? (
                          <select required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#173D2E] appearance-none cursor-pointer focus:outline-none focus:border-[#BF9F62]">
                            <option value="" disabled>Select City...</option>
                            {cities.map(c => (
                              <option key={c.id} value={c.id}>{c.cityName}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" required placeholder="City Name" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62]" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#173D2E] block mb-1">Shipping Fee</label>
                      <div className="bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#173D2E]">Rs. {shippingFee}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#173D2E] block mb-1">Full Delivery Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#173D2E]/60" />
                      <textarea required rows="2" placeholder="House #, Street #, Sector / Area..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-[#EFEAE0] border border-[#173D2E]/20 rounded-xl pl-9 pr-3.5 py-2 text-sm text-[#173D2E] focus:outline-none focus:border-[#BF9F62]"></textarea>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#173D2E]/15 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#173D2E]/60 block">Total Payable</span>
                    <span className="text-lg font-black text-[#173D2E]">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="bg-[#173D2E] hover:bg-[#235843] text-[#F5F1E6] font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
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