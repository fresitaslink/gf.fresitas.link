import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Download, FileText, Star, Award, ChevronDown, ChevronUp,
  Package, Clock, CheckCircle2, XCircle, TruckIcon, ArrowRight, User,
  CreditCard, MapPin, Gift, RefreshCw, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const STATUS_LABELS = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  on_the_way: 'En Camino', delivered: 'Entregado', cancelled: 'Cancelado'
};

const STATUS_CONFIG = {
  pending:   { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock },
  confirmed: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle2 },
  preparing: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: Package },
  on_the_way:{ color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: TruckIcon },
  delivered: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

function downloadInvoicePDF(order, user, language) {
  const doc = new jsPDF();
  const lang = language || 'es';

  // Header background
  doc.setFillColor(232, 52, 94);
  doc.rect(0, 0, 210, 38, 'F');

  // Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Fresitas G&F', 20, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(lang === 'es' ? 'Comprobante de Pedido' : 'Order Receipt', 20, 28);

  // Invoice number & date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`#${order.tracking_code || order.id.slice(-8).toUpperCase()}`, 190, 15, { align: 'right' });
  doc.text(new Date(order.created_date).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }), 190, 25, { align: 'right' });

  // Customer info block
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(lang === 'es' ? 'Cliente' : 'Customer', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(order.customer_name || user?.full_name || '—', 20, 60);
  doc.text(order.user_email || user?.email || '—', 20, 67);
  doc.text(order.customer_phone || '—', 20, 74);
  doc.text(order.customer_address || '—', 20, 81);

  // Order status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(lang === 'es' ? 'Estado' : 'Status', 130, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(STATUS_LABELS[order.status] || order.status, 130, 60);
  doc.text(`${lang === 'es' ? 'Pago' : 'Payment'}: ${order.payment_method || '—'}`, 130, 68);
  if (order.delivery_time_preference && order.delivery_time_preference !== 'asap') {
    doc.text(`📅 ${order.delivery_time_preference}`, 130, 76);
  }

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(20, 90, 190, 90);

  // Items table header
  doc.setFillColor(248, 248, 248);
  doc.rect(20, 93, 170, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(lang === 'es' ? 'Producto' : 'Product', 24, 100);
  doc.text(lang === 'es' ? 'Cant.' : 'Qty', 130, 100);
  doc.text(lang === 'es' ? 'P. Unit.' : 'Unit Price', 150, 100);
  doc.text(lang === 'es' ? 'Subtotal' : 'Subtotal', 175, 100);

  // Items rows
  let y = 110;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  (order.items || []).forEach((item, idx) => {
    if (y > 260) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y - 6, 170, 9, 'F');
    }
    doc.setFontSize(9);
    const itemName = item.name || '—';
    const sizeStr = item.size ? ` (${item.size})` : '';
    doc.text(`${itemName}${sizeStr}`, 24, y);
    doc.text(`${item.quantity || 1}`, 132, y);
    doc.text(`$${(item.price || 0).toFixed(2)}`, 152, y);
    doc.text(`$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`, 177, y);
    if (item.toppings?.length) {
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`  + ${item.toppings.join(', ')}`, 24, y);
      doc.setTextColor(40, 40, 40);
    }
    y += 8;
  });

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, 190, y);
  y += 8;

  // Totals
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(lang === 'es' ? 'Subtotal:' : 'Subtotal:', 140, y);
  doc.text(`$${(order.subtotal || order.total || 0).toFixed(2)}`, 190, y, { align: 'right' });
  y += 7;
  if (order.delivery_fee) {
    doc.text(lang === 'es' ? 'Envío:' : 'Delivery:', 140, y);
    doc.text(`$${order.delivery_fee.toFixed(2)}`, 190, y, { align: 'right' });
    y += 7;
  }
  if (order.discount && order.discount > 0) {
    doc.setTextColor(34, 160, 90);
    doc.text(lang === 'es' ? 'Descuento:' : 'Discount:', 140, y);
    doc.text(`-$${order.discount.toFixed(2)}`, 190, y, { align: 'right' });
    doc.setTextColor(80, 80, 80);
    y += 7;
  }
  // Total highlight
  doc.setFillColor(232, 52, 94);
  doc.rect(130, y - 2, 62, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'es' ? 'TOTAL:' : 'TOTAL:', 136, y + 6);
  doc.text(`$${(order.total || 0).toFixed(2)}`, 190, y + 6, { align: 'right' });

  // Loyalty points earned
  if (order.loyalty_points_earned) {
    y += 20;
    doc.setTextColor(232, 52, 94);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`⭐ +${order.loyalty_points_earned} pts ${lang === 'es' ? 'de lealtad ganados' : 'loyalty points earned'}`, 20, y);
  }

  // Notes
  if (order.notes) {
    y += 14;
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text(`📝 ${order.notes}`, 20, y);
  }

  // Footer
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 275, 210, 22, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text('Fresitas G&F — fresitasgf.com', 105, 283, { align: 'center' });
  doc.text(lang === 'es' ? 'Gracias por tu compra 🍓' : 'Thank you for your purchase 🍓', 105, 291, { align: 'center' });

  doc.save(`factura_${order.tracking_code || order.id.slice(-8)}.pdf`);
  toast.success(lang === 'es' ? 'Factura descargada' : 'Invoice downloaded');
}

function OrderCard({ order, language }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-10 h-10 rounded-xl bg-strawberry/10 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-strawberry" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm font-mono">#{order.tracking_code || order.id.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}{order.items?.length || 0} {language === 'es' ? 'items' : 'items'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm">${order.total?.toFixed(2)}</span>
          <Badge className={`text-xs hidden sm:flex ${cfg.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />{STATUS_LABELS[order.status]}
          </Badge>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              {/* Items list */}
              <div className="space-y-2">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.name}</p>
                      {item.size && <p className="text-xs text-muted-foreground">{item.size}</p>}
                      {item.toppings?.length > 0 && <p className="text-xs text-muted-foreground">+ {item.toppings.join(', ')}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">x{item.quantity || 1}</span>
                    <span className="font-semibold text-sm">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Order details */}
              <div className="bg-muted/50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">{language === 'es' ? 'Entrega:' : 'Address:'} </span>{order.customer_address || '—'}</div>
                <div><span className="text-muted-foreground">{language === 'es' ? 'Pago:' : 'Payment:'} </span>{order.payment_method || '—'}</div>
                {order.delivery_time_preference && order.delivery_time_preference !== 'asap' && (
                  <div className="col-span-2 text-purple-600 dark:text-purple-400">📅 {order.delivery_time_preference}</div>
                )}
                {order.notes && <div className="col-span-2 italic text-muted-foreground">"{order.notes}"</div>}
                {order.loyalty_points_earned > 0 && (
                  <div className="col-span-2 text-strawberry">⭐ +{order.loyalty_points_earned} {language === 'es' ? 'pts ganados' : 'pts earned'}</div>
                )}
              </div>

              {/* Totals */}
              <div className="flex items-center justify-between text-sm pt-1">
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {order.delivery_fee > 0 && <p>{language === 'es' ? 'Envío:' : 'Delivery:'} ${order.delivery_fee?.toFixed(2)}</p>}
                  {order.discount > 0 && <p className="text-green-600">{language === 'es' ? 'Descuento:' : 'Discount:'} -${order.discount?.toFixed(2)}</p>}
                  {order.promo_code && <p>{language === 'es' ? 'Promo:' : 'Promo:'} {order.promo_code}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{language === 'es' ? 'Total del pedido' : 'Order total'}</p>
                  <p className="font-bold text-lg text-strawberry">${order.total?.toFixed(2)}</p>
                </div>
              </div>

              {/* Download invoice button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-xl gap-2 border-strawberry text-strawberry hover:bg-strawberry/5"
                onClick={(e) => { e.stopPropagation(); downloadInvoicePDF(order, null, language); }}
              >
                <Receipt className="w-4 h-4" />
                {language === 'es' ? 'Descargar Factura PDF' : 'Download Invoice PDF'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoyaltyCard({ profile, loyaltyHistory, language }) {
  const totalEarned = loyaltyHistory.filter(t => t.type === 'earned' || t.type === 'bonus').reduce((s, t) => s + t.points, 0);
  const totalRedeemed = loyaltyHistory.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.points, 0);
  const currentPoints = profile?.loyalty_points || 0;
  const moneyValue = ((currentPoints / 100) * 5).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="bg-gradient-to-br from-strawberry via-pink-500 to-rose-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
            <span className="font-semibold">{language === 'es' ? 'Saldo de Puntos' : 'Points Balance'}</span>
          </div>
          <Gift className="w-5 h-5 opacity-70" />
        </div>
        <div className="font-poppins font-black text-6xl mb-1">{currentPoints.toLocaleString()}</div>
        <p className="text-pink-100 text-sm">{language === 'es' ? 'puntos de lealtad' : 'loyalty points'}</p>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-pink-100 text-sm">
            {language === 'es' ? `Equivalen a` : `Worth`} <span className="font-bold text-white text-lg">${moneyValue}</span> {language === 'es' ? 'de descuento' : 'in discount'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
          <div className="font-bold text-2xl text-green-600">+{totalEarned.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Total ganados' : 'Total earned'}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
          <div className="font-bold text-2xl text-red-500">-{totalRedeemed.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Total canjeados' : 'Total redeemed'}</p>
        </div>
      </div>

      {/* How to earn */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h4 className="font-semibold text-sm mb-3">{language === 'es' ? '¿Cómo ganar puntos?' : 'How to earn points?'}</h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-strawberry" /> {language === 'es' ? 'Cada $100 comprados = 10 puntos' : 'Every $100 spent = 10 points'}</div>
          <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-strawberry" /> {language === 'es' ? 'Referir amigos = 50 puntos bonus' : 'Refer friends = 50 bonus points'}</div>
          <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-strawberry" /> {language === 'es' ? '100 puntos = $5 de descuento' : '100 points = $5 discount'}</div>
        </div>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h4 className="font-semibold text-sm mb-3">{language === 'es' ? 'Historial de Puntos' : 'Points History'}</h4>
        {loyaltyHistory.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loyaltyHistory.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${tx.type === 'earned' || tx.type === 'bonus' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                  {tx.type === 'earned' || tx.type === 'bonus' ? '+' : '-'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US')}</p>
                </div>
                <span className={`font-bold text-sm flex-shrink-0 ${tx.type === 'earned' || tx.type === 'bonus' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'redeemed' ? '-' : '+'}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{language === 'es' ? 'Haz tu primer pedido para ganar puntos' : 'Place your first order to earn points'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MiCuenta() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    Promise.all([
      base44.entities.Order.filter({ user_email: user.email }, '-created_date', 500),
      base44.entities.CustomerProfile.filter({ user_email: user.email }),
      base44.entities.LoyaltyTransaction.filter({ user_email: user.email }, '-created_date', 200),
    ]).then(([ords, profiles, loyalty]) => {
      setOrders(ords);
      setProfile(profiles[0] || null);
      setLoyaltyHistory(loyalty);
    }).finally(() => setLoading(false));
  }, [user]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const totalSpent = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const downloadAllCSV = () => {
    const rows = orders.map(o => ({
      fecha: new Date(o.created_date).toLocaleString('es-MX'),
      codigo: o.tracking_code || '',
      total: o.total,
      estado: STATUS_LABELS[o.status] || o.status,
      metodo_pago: o.payment_method || '',
      items: o.items?.length || 0,
      direccion: o.customer_address || '',
      notas: o.notes || '',
    }));
    if (!rows.length) { toast.error('Sin datos'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mis_pedidos_fresitas.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-3xl mx-auto py-8 space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="py-8 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-strawberry to-pink-400 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(profile?.display_name || user.full_name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-poppins font-bold text-2xl text-foreground">
                {language === 'es' ? 'Mi Cuenta' : 'My Account'}
              </h1>
              <p className="text-muted-foreground text-sm">{profile?.display_name || user.full_name} · {user.email}</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="font-poppins font-bold text-2xl text-blue-600">{orders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Pedidos' : 'Orders'}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="font-poppins font-bold text-2xl text-green-600">${totalSpent.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Gastado' : 'Spent'}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="font-poppins font-bold text-2xl text-strawberry flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-strawberry" />{(profile?.loyalty_points || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{language === 'es' ? 'Puntos' : 'Points'}</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="orders">
            <TabsList className="w-full rounded-xl mb-6 bg-muted">
              <TabsTrigger value="orders" className="flex-1 rounded-lg text-xs">
                <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                {language === 'es' ? 'Pedidos' : 'Orders'}
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="flex-1 rounded-lg text-xs">
                <Star className="w-3.5 h-3.5 mr-1" />
                {language === 'es' ? 'Puntos' : 'Points'}
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <div className="space-y-4">
                {/* Filters + Export */}
                <div className="flex items-center gap-2 flex-wrap">
                  {['all', 'pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        statusFilter === s
                          ? 'bg-strawberry text-white border-strawberry'
                          : 'border-border text-muted-foreground hover:border-strawberry/50'
                      }`}
                    >
                      {s === 'all' ? (language === 'es' ? 'Todos' : 'All') : STATUS_LABELS[s]}
                      {s === 'all' && ` (${orders.length})`}
                      {s !== 'all' && ` (${orders.filter(o => o.status === s).length})`}
                    </button>
                  ))}
                  <Button
                    onClick={downloadAllCSV}
                    variant="outline"
                    size="sm"
                    className="ml-auto rounded-xl gap-1.5 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> CSV
                  </Button>
                </div>

                {/* Orders list */}
                {filteredOrders.length > 0 ? (
                  <div className="space-y-3">
                    {filteredOrders.map(order => (
                      <OrderCard key={order.id} order={order} language={language} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{language === 'es' ? 'Sin pedidos' : 'No orders'}</p>
                    <Link to="/menu">
                      <Button size="sm" className="mt-4 bg-strawberry hover:bg-strawberry/90 text-white rounded-xl">
                        {language === 'es' ? '¡Pedir ahora!' : 'Order now!'}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Loyalty Tab */}
            <TabsContent value="loyalty">
              <LoyaltyCard profile={profile} loyaltyHistory={loyaltyHistory} language={language} />
            </TabsContent>
          </Tabs>

          {/* Quick links */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link to="/perfil">
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-strawberry/50 transition-colors cursor-pointer">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{language === 'es' ? 'Mi Perfil' : 'My Profile'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'es' ? 'Datos y direcciones' : 'Info & addresses'}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </Link>
            <Link to="/referral">
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-strawberry/50 transition-colors cursor-pointer">
                <Gift className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{language === 'es' ? 'Referidos' : 'Referrals'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'es' ? 'Gana más puntos' : 'Earn more points'}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}