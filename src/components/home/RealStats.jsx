import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Package, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

function AnimatedCounter({ target, suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || target === 0) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(parseFloat(start.toFixed(decimals)));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, decimals]);

  return <span ref={ref}>{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}</span>;
}

export default function RealStats() {
  const { language } = useLanguage();
  const [stats, setStats] = useState({ customers: 0, orders: 0, avgRating: 0, ratingCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.CustomerProfile.list('-created_date', 1000),
      base44.entities.Order.filter({ status: 'delivered' }, '-created_date', 500),
    ]).then(([profiles, orders]) => {
      const ratedOrders = orders.filter(o => o.rating);
      const avgRating = ratedOrders.length > 0
        ? ratedOrders.reduce((s, o) => s + o.rating, 0) / ratedOrders.length
        : 0;
      setStats({
        customers: profiles.length,
        orders: orders.length,
        avgRating,
        ratingCount: ratedOrders.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const items = [
    {
      icon: Users,
      value: stats.customers,
      suffix: '+',
      label: language === 'es' ? 'Clientes Registrados' : 'Registered Customers',
      color: 'text-strawberry',
      bg: 'bg-strawberry/10',
    },
    {
      icon: Package,
      value: stats.orders,
      suffix: '+',
      label: language === 'es' ? 'Pedidos Entregados' : 'Orders Delivered',
      color: 'text-chocolate',
      bg: 'bg-chocolate/10',
    },
    {
      icon: Star,
      value: stats.avgRating,
      suffix: stats.ratingCount > 0 ? ` (${stats.ratingCount})` : '',
      label: language === 'es' ? 'Calificación Promedio' : 'Average Rating',
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      decimals: 1,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-10 mt-12 flex-wrap">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center animate-pulse">
            <div className="h-8 w-20 bg-muted rounded-lg mx-auto mb-1" />
            <div className="h-3 w-24 bg-muted rounded mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  // Only show if there's real data
  if (stats.customers === 0 && stats.orders === 0) return null;

  return (
    <div className="flex items-center justify-center gap-10 mt-12 flex-wrap">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.12 }}
            className="text-center"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.bg} mb-2 mx-auto`}>
              <Icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div className={`font-poppins font-black text-2xl sm:text-3xl ${item.color}`}>
              <AnimatedCounter target={item.value} suffix={item.suffix} decimals={item.decimals || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">{item.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}