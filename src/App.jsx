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
  Building
} from 'lucide-react';

// Supabase Client Setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checkout Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: ''
  });

  // Async Product Fetch
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      if (!supabase) {
        console.warn('Supabase credentials missing. Check Vercel Environment Variables.');
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted) {
          if (error) {
            console.error('Error fetching products:', error.message);
          } else if (data) {
            setProducts(data);
          }
        }
      } catch (err) {
        if (isMounted) console.error('Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cart Functions
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Pricing Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 5000 || subtotal === 0 ? 0 : 250;
  const grandTotal = subtotal + shippingFee;

  // Order Submission
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.city || !formData.address) {
      alert('Please complete all required delivery fields.');
      return;
    }

    if (!supabase) {
      alert('Database connection error. Environment variables are missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('orders').insert([
        {
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_city: formData.city,
          customer_address: formData.address,
          items: cart,
          total_amount: grandTotal,
          status: 'Pending COD'
        }
      ]);

      if (error) {
        console.error('Order error:', error.message);
        alert('Failed to place order. Please try again.');
      } else {
        setOrderSubmitted(true);
        setCart([]);
      }
    } catch (err) {
      console.error('Order Submission Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category & Search Filters
  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#102B20] text-[#F5F1E6] font-sans pb-20">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#173D2E]/95 backdrop-blur-md border-b border-[#BF9F62]/25 px-4 lg:px-8 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Section */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setSelectedCategory('All')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#BF9F62]/15 border border-[#BF9F62]/40 flex items-center justify-center shadow-md">
              <span className="font-extrabold text-[#BF9F62] tracking-tight text-lg">BR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-[#F5F1E6] tracking-wider">
                BAZAAR RETAIL
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#BF9F62]/70" />
            <input
              type="text"
              placeholder="Search products in Bazaar Retail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#102B20] border border-[#BF9F62]/30 rounded-xl pl-9 pr-4 py-2 text-sm text-[#F5F1E6] placeholder-[#F5F1E6]/40 focus:outline-none focus:border-[#BF9F62] transition-all"
            />
          </div>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-xl bg-[#102B20] border border-[#BF9F62]/35 hover:bg-[#1f4e3b] text-[#BF9F62] transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#BF9F62] text-[#173D2E] text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cart.reduce((a, c) => a + c.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#BF9F62]/10 via-[#173D2E]/60 to-transparent py-14 px-4 border-b border-[#BF9F62]/20">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#BF9F62]/15 border border-[#BF9F62]/35 text-[#BF9F62] text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Premium Shopping Experience
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F5F1E6]">
            Quality Products Delivered by <span className="text-[#BF9F62]">Bazaar Retail</span>
          </h1>
          <p className="text-[#F5F1E6]/75 text-sm sm:text-base max-w-xl mx-auto">
            Free shipping across Pakistan on orders over Rs. 5,000. Pay cash upon delivery at your doorstep.
          </p>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-8">
        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#BF9F62] text-[#173D2E] font-bold shadow-lg shadow-[#BF9F62]/20'
                  : 'bg-[#173D2E] border border-[#BF9F62]/25 text-[#F5F1E6]/80 hover:bg-[#20513e] hover:text-[#F5F1E6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 text-[#BF9F62] animate-spin" />
            <p className="text-[#F5F1E6]/70 text-sm font-medium">Loading Bazaar Retail catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#173D2E]/40 rounded-3xl border border-[#BF9F62]/20 my-8">
            <ShoppingBag className="w-12 h-12 text-[#BF9F62]/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#F5F1E6]">No products found</h3>
            <p className="text-[#F5F1E6]/60 text-sm mt-1">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-[#173D2E] rounded-2xl border border-[#BF9F62]/25 hover:border-[#BF9F62]/60 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#BF9F62]/10"
              >
                <div className="relative aspect-square overflow-hidden bg-[#102B20]">
                  <img
                    src={product.image || 'https://via.placeholder.com/400x400?text=No+Image'}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.category && (
                    <span className="absolute top-3 left-3 bg-[#102B20]/90 backdrop-blur-md border border-[#BF9F62]/30 text-[#BF9F62] text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {product.category}
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-[#F5F1E6] group-hover:text-[#BF9F62] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-[#F5F1E6]/65 text-xs line-clamp-2 mt-1">
                      {product.description || 'Premium quality guaranteed by Bazaar Retail.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#BF9F62]/20">
                    <div>
                      <span className="text-xs text-[#F5F1E6]/50 block">Price</span>
                      <span className="text-xl font-extrabold text-[#BF9F62]">
                        Rs. {Number(product.price || 0).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="bg-[#BF9F62] hover:bg-[#a88a52] text-[#173D2E] font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-[#BF9F62]/10"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#173D2E] h-full shadow-2xl flex flex-col justify-between border-l border-[#BF9F62]/30">
            <div className="p-5 border-b border-[#BF9F62]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#BF9F62]" />
                <h2 className="text-lg font-bold text-[#F5F1E6]">Your Cart</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-[#F5F1E6]/60 hover:text-[#F5F1E6] hover:bg-[#102B20]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-[#F5F1E6]/40">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50 text-[#BF9F62]" />
                  <p>Your shopping cart is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 bg-[#102B20]/60 border border-[#BF9F62]/20 rounded-xl items-center"
                  >
                    <img
                      src={item.image || 'https://via.placeholder.com/100'}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover bg-[#102B20]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#F5F1E6] truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#BF9F62] font-bold mt-0.5">
                        Rs. {Number(item.price || 0).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-md bg-[#235843] flex items-center justify-center text-[#F5F1E6] hover:bg-[#2e6d54]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-[#F5F1E6]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-md bg-[#235843] flex items-center justify-center text-[#F5F1E6] hover:bg-[#2e6d54]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[#F5F1E6]/50 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-[#BF9F62]/20 space-y-4 bg-[#102B20]/80">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#F5F1E6]/70">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#F5F1E6]/70">
                    <span>Shipping Fee</span>
                    <span>{shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}`}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#F5F1E6] pt-2 border-t border-[#BF9F62]/20">
                    <span>Total Amount</span>
                    <span className="text-[#BF9F62]">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-[#BF9F62] hover:bg-[#a88a52] text-[#173D2E] py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-[#BF9F62]/20"
                >
                  Proceed to Checkout (COD)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#173D2E] border border-[#BF9F62]/30 rounded-3xl w-full max-w-lg p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => {
                setIsCheckoutOpen(false);
                setOrderSubmitted(false);
              }}
              className="absolute top-5 right-5 p-1 rounded-lg text-[#F5F1E6]/60 hover:text-[#F5F1E6]"
            >
              <X className="w-5 h-5" />
            </button>

            {orderSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-[#BF9F62]/15 border border-[#BF9F62]/40 text-[#BF9F62] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-[#F5F1E6]">Order Confirmed!</h3>
                <p className="text-[#F5F1E6]/70 text-sm max-w-sm mx-auto">
                  Thank you for shopping with Bazaar Retail. Our representative will contact you via WhatsApp shortly to confirm delivery.
                </p>
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setOrderSubmitted(false);
                  }}
                  className="mt-4 bg-[#102B20] border border-[#BF9F62]/30 hover:bg-[#20513e] text-[#F5F1E6] px-6 py-2.5 rounded-xl font-semibold text-sm"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#F5F1E6]">Cash on Delivery Checkout</h2>
                  <p className="text-xs text-[#F5F1E6]/60 mt-1">
                    Provide complete delivery details for shipping by Bazaar Retail.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#F5F1E6] block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ali Ahmed"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#102B20] border border-[#BF9F62]/30 rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] focus:outline-none focus:border-[#BF9F62]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F5F1E6] block mb-1">
                      WhatsApp / Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#BF9F62]" />
                      <input
                        type="tel"
                        required
                        placeholder="0300 1234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#102B20] border border-[#BF9F62]/30 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#F5F1E6] focus:outline-none focus:border-[#BF9F62]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#F5F1E6] block mb-1">
                        City
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#BF9F62]" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lahore / Karachi"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full bg-[#102B20] border border-[#BF9F62]/30 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#F5F1E6] focus:outline-none focus:border-[#BF9F62]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#F5F1E6] block mb-1">
                        Shipping Fee
                      </label>
                      <div className="bg-[#102B20] border border-[#BF9F62]/30 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#BF9F62]">
                        {shippingFee === 0 ? 'FREE Shipping' : `Rs. ${shippingFee}`}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F5F1E6] block mb-1">
                      Full Delivery Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#BF9F62]" />
                      <textarea
                        required
                        rows="2"
                        placeholder="House #, Street #, Sector / Area..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-[#102B20] border border-[#BF9F62]/30 rounded-xl pl-9 pr-3.5 py-2 text-sm text-[#F5F1E6] focus:outline-none focus:border-[#BF9F62]"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#BF9F62]/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#F5F1E6]/50 block">Total Payable</span>
                    <span className="text-lg font-black text-[#BF9F62]">
                      Rs. {grandTotal.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#BF9F62] hover:bg-[#a88a52] text-[#173D2E] font-black px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#BF9F62]/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      'Confirm Order (COD)'
                    )}
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