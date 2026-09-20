import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, MessageCircle, Phone, MapPin, Search, Package, IndianRupee, Loader2, Plus, Minus, Trash2, X, Share2, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";

interface CatalogProduct {
  _id: string;
  name: string;
  pricePerUnit: number;
  mrp: number;
  unit: string;
  imageUrl?: string;
  category?: string;
  stock: number;
}

interface CartItem extends CatalogProduct {
  quantity: number;
}

interface CatalogData {
  shopName: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  products: CatalogProduct[];
}

interface CatalogProps {
  customDomainMode?: boolean;
}

const Catalog: React.FC<CatalogProps> = ({ customDomainMode = false }) => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [isCopied, setIsCopied] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        let res;
        if (customDomainMode) {
          const currentHost = window.location.hostname;
          res = await axios.get('/api/catalog/by-domain/lookup', {
            params: { domain: currentHost },
            headers: { 'x-custom-domain': currentHost }
          });
        } else {
          res = await axios.get(`/api/catalog/${slug}`);
        }
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Catalog not found");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [slug, customDomainMode]);

  useEffect(() => {
    // Load cart from localStorage
    const cartKey = customDomainMode ? `cart_${window.location.hostname}` : `cart_${slug}`;
    const savedCart = localStorage.getItem(cartKey);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, [slug, customDomainMode]);

  useEffect(() => {
    // Save cart to localStorage
    if (data) {
      const cartKey = customDomainMode ? `cart_${window.location.hostname}` : `cart_${slug}`;
      localStorage.setItem(cartKey, JSON.stringify(cart));
    }
  }, [cart, slug, data, customDomainMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading Catalog...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <Package size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">{error || "Catalog Not Found"}</h1>
          <p className="text-slate-500 mb-8">The shop link you followed might be incorrect or the shop is currently offline.</p>
        </div>
      </div>
    );
  }

  const categories = ["All", ...Array.from(new Set(data.products.map(p => p.category || "General")))];
  
  const filteredProducts = data.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || (p.category || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: CatalogProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    let message = `*NEW ORDER FROM CATALOG*\n`;
    message += `--------------------------\n`;
    message += `*Shop:* ${data.shopName}\n\n`;
    
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`;
      message += `   Qty: ${item.quantity} ${item.unit}\n`;
      message += `   Price: ₹${item.pricePerUnit} | Total: ₹${item.pricePerUnit * item.quantity}\n\n`;
    });

    message += `--------------------------\n`;
    message += `*GRAND TOTAL: ₹${cartTotal}*\n`;
    message += `--------------------------\n\n`;
    message += `Please confirm my order. Thank you!`;

    let targetNumber = (data.phone || "").replace(/\D/g, "");
    
    // Auto-fix Indian numbers: if 10 digits, add 91. If 11 digits starting with 0, replace 0 with 91.
    if (targetNumber.length === 10) {
      targetNumber = "91" + targetNumber;
    } else if (targetNumber.length === 11 && targetNumber.startsWith("0")) {
      targetNumber = "91" + targetNumber.substring(1);
    }

    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Helmet>
        <title>{data.shopName} - Digital Catalog</title>
        <meta name="description" content={`Browse products from ${data.shopName} and place your orders online.`} />
        <meta property="og:title" content={`${data.shopName} - Digital Catalog`} />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt={data.shopName} className="w-12 h-12 rounded-2xl object-cover shadow-md border border-slate-50" />
              ) : (
                <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                  {data.shopName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-black text-slate-800 truncate leading-tight">{data.shopName}</h1>
                <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  <span className="flex items-center gap-1"><Phone size={10} /> {data.phone || "No Phone"}</span>
                  {data.address && <span className="hidden sm:flex items-center gap-1 truncate"><MapPin size={10} /> {data.address}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="p-3 bg-primary-50 text-primary-600 rounded-2xl hover:bg-primary-600 hover:text-white transition-all shadow-sm active:scale-95 relative"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
                    {cartCount}
                  </span>
                )}
              </button>
              <a 
                href={`tel:${data.phone}`}
                className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <Phone size={20} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero / Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 -rotate-12 transform transition-transform group-hover:scale-110 duration-700">
             <ShoppingCart size={200} />
          </div>
          <div className="relative z-10">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Welcome to our Catalog</span>
            <h2 className="text-3xl font-black mb-2 leading-tight">Explore Our Digital Showroom</h2>
            <p className="text-white/80 max-w-lg text-sm font-medium leading-relaxed">
              Browse our latest stock and place orders directly via WhatsApp. High quality products at best prices.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sticky top-[81px] z-20 bg-slate-50/80 backdrop-blur-md py-2">
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-14 pr-6 text-sm font-bold shadow-sm focus:border-primary-500 focus:ring-0 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar items-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  const newParams = new URLSearchParams(searchParams);
                  if (cat === "All") newParams.delete("category");
                  else newParams.set("category", cat);
                  setSearchParams(newParams);
                }}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === cat
                    ? "bg-primary-600 text-white shadow-primary-200"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                if (selectedCategory !== "All") {
                  url.searchParams.set("category", selectedCategory);
                } else {
                  url.searchParams.delete("category");
                }
                navigator.clipboard.writeText(url.toString());
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ml-1"
              title="Copy link for selected category"
            >
              {isCopied ? <Check size={14} /> : <Share2 size={14} />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isCopied ? "Link Copied!" : "Share Category"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
             <Package size={48} className="mx-auto text-slate-200 mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No products found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div 
                key={product._id} 
                className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full"
              >
                {/* Image Placeholder or Image */}
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Package size={48} strokeWidth={1.5} />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-2">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm border border-slate-100">
                      {product.category || "General"}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="mb-4 flex-grow">
                    <h3 className="text-lg font-black text-slate-800 leading-snug mb-1 group-hover:text-primary-600 transition-colors">{product.name}</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Available in {product.unit}</p>
                  </div>
                               <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] line-through font-bold decoration-rose-500/50 decoration-2">₹{product.mrp}</span>
                      <div className="flex items-center gap-1 text-2xl font-black text-slate-800">
                         <IndianRupee size={18} className="text-emerald-500" />
                         {product.pricePerUnit}
                      </div>
                    </div>
                    {product.mrp > product.pricePerUnit && (
                      <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                        {Math.round(((product.mrp - product.pricePerUnit) / product.mrp) * 100)}% Off
                      </div>
                    )}
                  </div>

                  {cart.find(item => item._id === product._id) ? (
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      <button 
                        onClick={() => {
                          const item = cart.find(i => i._id === product._id);
                          if (item?.quantity === 1) removeFromCart(product._id);
                          else updateQuantity(product._id, -1);
                        }}
                        className="w-10 h-10 bg-white text-slate-600 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="flex-grow text-center font-black text-slate-800">
                        {cart.find(item => item._id === product._id)?.quantity}
                      </div>
                      <button 
                        onClick={() => updateQuantity(product._id, 1)}
                        className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-100 transition-all active:scale-95 group-hover:-translate-y-1"
                    >
                      <ShoppingCart size={18} />
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-2xl animate-in slide-in-from-bottom-20 duration-500"
          >
            <ShoppingCart size={24} />
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {cartCount}
            </span>
          </button>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-20 py-12 bg-white border-t border-slate-100 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Powered by</p>
        <div className="flex items-center justify-center gap-2">
           <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-sm">B</div>
           <span className="text-slate-800 font-black tracking-tight">BuildMate ERP</span>
        </div>
      </footer>

      {/* Cart Drawer / Modal */}
      {isCartOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            {/* Cart Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Your Cart</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{cartCount} Items Selected</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-4">
                    <ShoppingCart size={40} />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Your cart is empty</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 text-primary-600 font-black uppercase tracking-widest text-[10px] hover:underline"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="flex gap-4 group/item">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Package size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-800 text-sm leading-tight">{item.name}</h4>
                        <button onClick={() => removeFromCart(item._id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">₹{item.pricePerUnit} / {item.unit}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button 
                            onClick={() => updateQuantity(item._id, -1)}
                            className="w-7 h-7 bg-white text-slate-400 rounded-lg flex items-center justify-center hover:text-primary-600 shadow-sm transition-all"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-black text-slate-800 w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item._id, 1)}
                            className="w-7 h-7 bg-white text-slate-400 rounded-lg flex items-center justify-center hover:text-primary-600 shadow-sm transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="font-black text-slate-800">
                          ₹{item.pricePerUnit * item.quantity}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-2xl font-black text-slate-800">₹{cartTotal}</span>
                </div>
                <button 
                  onClick={handlePlaceOrder}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-[0.98]"
                >
                  <MessageCircle size={20} />
                  Order on WhatsApp
                </button>
                <p className="text-center text-[10px] text-slate-400 font-medium">
                  We will send your order summary to WhatsApp for confirmation.
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Catalog;
