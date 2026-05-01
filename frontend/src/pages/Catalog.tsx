import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, MessageCircle, Phone, MapPin, Search, Package, IndianRupee, Loader2 } from "lucide-react";

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

interface CatalogData {
  shopName: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  products: CatalogProduct[];
}

const Catalog = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await axios.get(`/api/catalog/${slug}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Catalog not found");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [slug]);

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

  const handleWhatsAppOrder = (product: CatalogProduct) => {
    const message = `Hello ${data.shopName}! I'm interested in ordering:\n\n*Product:* ${product.name}\n*Price:* ₹${product.pricePerUnit}/${product.unit}\n\nPlease let me know if it's available.`;
    const whatsappUrl = `https://wa.me/${data.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
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
            <a 
              href={`tel:${data.phone}`}
              className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Phone size={20} />
            </a>
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
          
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === cat
                    ? "bg-primary-600 text-white shadow-primary-200"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
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

                  <button
                    onClick={() => handleWhatsAppOrder(product)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95 group-hover:-translate-y-1"
                  >
                    <MessageCircle size={18} />
                    Order on WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 py-12 bg-white border-t border-slate-100 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Powered by</p>
        <div className="flex items-center justify-center gap-2">
           <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-sm">B</div>
           <span className="text-slate-800 font-black tracking-tight">BuildMate ERP</span>
        </div>
      </footer>
    </div>
  );
};

export default Catalog;
