import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Users,
  ChevronRight,
  Package,
  Menu,
  X,
  Zap,
  BarChart3,
  ArrowRight,
  PlayCircle,
  Star,
  CheckCircle2,
  LineChart,
  BookOpen,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import SEO from "../components/SEO";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [showVideo, setShowVideo] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const features = [
    {
      icon: Zap,
      title: t("landing.ultra_fast_billing"),
      description: t("landing.billing_desc"),
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      icon: Package,
      title: t("landing.smart_inventory"),
      description: t("landing.inventory_desc"),
      color: "text-primary-600",
      bg: "bg-primary-50",
    },
    {
      icon: Globe,
      title: t("landing.digital_catalog"),
      description: t("landing.digital_catalog_desc"),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: ShieldCheck,
      title: t("landing.staff_rbac"),
      description: t("landing.staff_rbac_desc"),
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      icon: BookOpen,
      title: t("landing.customer_ledger"),
      description: t("landing.customer_ledger_desc"),
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      icon: LineChart,
      title: t("landing.analytics_reports"),
      description: t("landing.analytics_reports_desc"),
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  const steps = [
    {
      title: t("landing.step1_title"),
      description: t("landing.step1_desc"),
      icon: "01",
    },
    {
      title: t("landing.step2_title"),
      description: t("landing.step2_desc"),
      icon: "02",
    },
    {
      title: t("landing.step3_title"),
      description: t("landing.step3_desc"),
      icon: "03",
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary-100 selection:text-primary-900 overflow-x-hidden">
      <SEO />

      {/* Header / Nav */}
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-500",
          scrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4"
            : "bg-transparent py-6",
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-200 group-hover:rotate-12 transition-transform duration-500">
              <Package size={22} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              BuildMate<span className="text-primary-600">ERP</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-10">
            <div className="flex items-center gap-8 text-sm font-bold text-slate-500">
              <a
                href="#features"
                className="hover:text-primary-600 transition-colors"
              >
                {t("landing.features_link")}
              </a>
              <a
                href="#how-it-works"
                className="hover:text-primary-600 transition-colors"
              >
                {t("landing.how_it_works")}
              </a>
              <Link
                to="/pricing"
                className="hover:text-primary-600 transition-colors"
              >
                {t("landing.pricing")}
              </Link>
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center gap-6">
              {/* Language Switcher */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => changeLanguage('en')}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-black transition-all",
                    i18n.language === 'en' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  EN
                </button>
                <button 
                  onClick={() => changeLanguage('hi')}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-black transition-all",
                    i18n.language === 'hi' ? "bg-white text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  हिन्दी
                </button>
              </div>

              <div className="flex items-center gap-4">
                {user ? (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    {t("common.dashboard")}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate("/login")}
                      className="text-sm font-black text-slate-900 px-4"
                    >
                      {t("common.login")}
                    </button>
                    <button
                      onClick={() => navigate("/register")}
                      className="px-8 py-3 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-100"
                    >
                      {t("common.get_started")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-slate-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-0 left-0 w-full h-screen bg-white z-50 p-6 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white">
                  <Package size={18} />
                </div>
                <span className="text-xl font-black tracking-tighter">
                  BuildMate ERP
                </span>
              </div>
              <button onClick={() => setIsMenuOpen(false)}>
                <X size={28} />
              </button>
            </div>
            <div className="flex flex-col gap-6 text-2xl font-black text-slate-900 mb-12">
              <a href="#features" onClick={() => setIsMenuOpen(false)}>
                {t("landing.features_link")}
              </a>
              <a href="#how-it-works" onClick={() => setIsMenuOpen(false)}>
                {t("landing.how_it_works")}
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/pricing");
                  setIsMenuOpen(false);
                }}
              >
                {t("landing.pricing")}
              </a>
              
              {/* Mobile Language Switcher */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => { changeLanguage('en'); setIsMenuOpen(false); }}
                  className={cn("text-lg font-black", i18n.language === 'en' ? "text-primary-600" : "text-slate-400")}
                >
                  English
                </button>
                <button 
                  onClick={() => { changeLanguage('hi'); setIsMenuOpen(false); }}
                  className={cn("text-lg font-black", i18n.language === 'hi' ? "text-primary-600" : "text-slate-400")}
                >
                  हिन्दी
                </button>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-4">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl font-black"
              >
                {t("common.login")}
              </button>
              <button
                onClick={() => navigate("/register")}
                className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl shadow-primary-100"
              >
                {t("landing.get_started_free")}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-48 pb-20 px-6 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-50 rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] opacity-40"></div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full border border-primary-100 text-primary-600 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Star size={14} className="fill-primary-600" />
              {t("landing.hero_tagline")}
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-[-0.04em] leading-[0.95] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              {t("landing.hero_title_part1")} <span className="text-primary-600">ERP</span> {t("landing.hero_title_part2")}
            </h1>

            <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              {t("landing.hero_subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <button
                onClick={() => navigate("/register")}
                className="w-full sm:w-auto px-10 py-5 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {t("landing.get_started_free")} <ArrowRight size={20} />
              </button>
              <button
                onClick={() => setShowVideo(true)}
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm border-2 border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <PlayCircle size={20} className="text-primary-600" /> {t("landing.view_demo")}
              </button>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-8 pt-8 opacity-60 grayscale animate-in fade-in duration-1000 delay-500">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl font-black text-slate-900">24/7</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t("landing.support")}
                </span>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl font-black text-slate-900">
                  99.9%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t("landing.uptime")}
                </span>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl font-black text-slate-900">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t("landing.secure")}
                </span>
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-right-10 duration-1000 delay-300">
            <div className="absolute inset-0 bg-primary-600/5 rounded-[3rem] -rotate-3 scale-105"></div>
            <div className="relative bg-slate-900 rounded-[2.5rem] p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-800">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2426&q=80"
                alt="BuildMate Dashboard"
                className="rounded-[2rem] w-full shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-24 space-y-4">
            <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">
              {t("landing.features_tag")}
            </h2>
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">
              {t("landing.features_title")}
            </h3>
            <p className="text-lg text-slate-500 font-medium">
              {t("landing.features_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 hover:border-primary-100 hover:shadow-2xl hover:shadow-primary-100/30 transition-all duration-500"
              >
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-inherit",
                    feature.bg,
                  )}
                >
                  <feature.icon className={cn("w-8 h-8", feature.color)} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-4">
                  {feature.title}
                </h4>
                <p className="text-slate-500 font-medium leading-relaxed mb-6">
                  {feature.description}
                </p>
                <div className="flex items-center gap-2 text-primary-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  {t("landing.learn_more")} <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="space-y-4 text-center lg:text-left">
                <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">
                  {t("landing.process_tag")}
                </h2>
                <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-none">
                  {t("landing.process_title")}
                </h3>
                <p className="text-lg text-slate-500 font-medium max-w-xl">
                  {t("landing.process_desc")}
                </p>
              </div>

              <div className="space-y-8">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0 group-hover:bg-primary-600 transition-colors duration-500">
                      {step.icon}
                    </div>
                    <div className="space-y-1 py-1">
                      <h5 className="text-xl font-black text-slate-900 tracking-tight">
                        {step.title}
                      </h5>
                      <p className="text-slate-500 font-medium leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary-50 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 text-primary-100 opacity-50 group-hover:scale-110 transition-transform duration-700">
                <Zap size={200} />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="p-4 bg-white rounded-2xl inline-block shadow-lg">
                  <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                </div>
                <h4 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                  {t("landing.cta_title")}
                </h4>
                <p className="text-lg text-slate-600 font-medium">
                  {t("landing.cta_desc")}
                </p>
                <button
                  onClick={() => navigate("/register")}
                  className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  {t("landing.start_trial")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto bg-primary-600 rounded-[3rem] p-16 text-center text-white relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(37,99,235,0.4)]">
          <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px]"></div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
              {t("landing.growth_journey")}
            </h2>
            <p className="text-primary-100 text-xl font-medium opacity-90">
              {t("landing.no_card_req")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <button
                onClick={() => navigate("/register")}
                className="w-full sm:w-auto px-12 py-5 bg-white text-primary-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all shadow-2xl"
              >
                {t("landing.create_account")}
              </button>
              <button
                onClick={() => navigate("/contact")}
                className="w-full sm:w-auto px-12 py-5 bg-primary-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-primary-800 transition-all"
              >
                {t("landing.talk_sales")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-1 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                  <Package size={18} />
                </div>
                <span className="text-xl font-black tracking-tighter text-slate-900">
                  BuildMate<span className="text-primary-600">ERP</span>
                </span>
              </div>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                {t("landing.footer_desc")}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
                {t("landing.product")}
              </h4>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/pricing"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.pricing")}
                  </Link>
                </li>
                <li>
                  <a
                    href="#features"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.features_link")}
                  </a>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("common.register")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
                {t("landing.support_label")}
              </h4>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/contact"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.contact_us")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact?subject=Report%20a%20Bug"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.report_bug")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact?subject=Request%20a%20Feature"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.request_feature")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
                {t("landing.legal")}
              </h4>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/privacy"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.privacy_policy")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-slate-600 hover:text-primary-600 text-sm font-bold transition-colors block"
                  >
                    {t("landing.terms_service")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              &copy; {new Date().getFullYear()} BuildMate ERP. All rights
              reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t("landing.made_in_india")}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVideo(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setShowVideo(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X size={24} />
              </button>
              <iframe
                src="https://www.youtube.com/embed/Oo-anzrFgug?autoplay=1&mute=0"
                title="BuildMate ERP Demo"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
