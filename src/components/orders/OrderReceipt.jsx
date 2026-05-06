import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, X, CheckCircle, MapPin, Clock, CreditCard, Star, Package, Zap, User, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/StoreContext';

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En Preparación',
  on_the_way: 'En Camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#F97316',
  on_the_way: '#8B5CF6',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

export default function OrderReceipt({ order, onClose }) {
  const receiptRef = useRef(null);
  const { storeSettings } = useStore();
  const [logoError, setLogoError] = useState(false);

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head>
        <title>Recibo Fresitas #${order.tracking_code}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { background: linear-gradient(135deg, #E8294A, #c0203b); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .body { padding: 24px; background: #fff; }
          .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; padding: 12px 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .footer { text-align: center; color: #999; font-size: 12px; padding: 16px; }
          @media print { button { display: none; } }
        </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ format: 'a5', unit: 'mm', compress: true });
      const pw = 148;
      const margin = 10;
      let y = 10;

      // Gradient Header with Logo
      doc.setFillColor(232, 41, 74);
      doc.rect(0, 0, pw, 45, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(0, 45, pw, 45);

      // Logo & Store Name
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Fresitas G&F', pw / 2, y + 8, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Fresas · Chocolate · Crema & Más', pw / 2, y + 13, { align: 'center' });

      // Order Code Box
      doc.setFillColor(255, 255, 255, 0.15);
      doc.roundedRect(pw / 2 - 28, y + 16, 56, 12, 2, 2, 'F');
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.text(`PEDIDO #${order.tracking_code}`, pw / 2, y + 24, { align: 'center' });

      y = 50;
      doc.setTextColor(51, 51, 51);

      // Date & Status
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const orderDate = new Date(order.created_date || Date.now());
      doc.text(`Fecha: ${orderDate.toLocaleDateString('es-MX')}`, margin, y);
      doc.text(`Hora: ${orderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, pw - margin, y, { align: 'right' });
      y += 7;

      // Customer Info Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, y, pw - 2 * margin, 28, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(232, 41, 74);
      doc.text('INFORMACIÓN DE ENVÍO', margin + 3, y + 4);
      doc.setTextColor(51, 51, 51);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Cliente: ${order.customer_name}`, margin + 3, y + 10);
      doc.text(`Teléfono: ${order.customer_phone || 'N/A'}`, margin + 3, y + 15);
      doc.text(`Dirección: ${(order.customer_address || 'N/A').substring(0, 45)}`, margin + 3, y + 20);
      doc.text(`Horario: ${order.delivery_time_preference || 'ASAP'}`, margin + 3, y + 25);
      y += 32;

      // Items Section
      doc.setFillColor(232, 41, 74);
      doc.rect(margin, y, pw - 2 * margin, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PRODUCTOS', margin + 2, y + 3.5);
      y += 7;

      doc.setTextColor(51, 51, 51);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setDrawColor(220, 220, 220);

      const items = order.items || [];
      items.forEach((item, idx) => {
        if (y > 240) { doc.addPage(); y = 10; }
        doc.line(margin, y, pw - margin, y);
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.name}`, margin + 2, y + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        if (item.size) doc.text(`Tamaño: ${item.size}`, margin + 2, y + 5);
        const toppings = item.toppings?.join(', ') || '';
        if (toppings) doc.text(`Extras: ${toppings.substring(0, 35)}`, margin + 2, y + 8);
        doc.setFontSize(8);
        doc.text(`x${item.quantity}`, pw - 28, y + 2, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(`$${(item.price || 0).toFixed(2)}`, pw - margin - 2, y + 2, { align: 'right' });
        y += 12;
      });

      // Summary Box
      y += 2;
      doc.setDrawColor(232, 41, 74);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pw - margin, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Subtotal', margin, y);
      doc.text(`$${(order.subtotal || 0).toFixed(2)}`, pw - margin, y, { align: 'right' });
      y += 5;

      if (order.delivery_fee && order.delivery_fee > 0) {
        doc.text('Envío', margin, y);
        doc.text(`$${(order.delivery_fee || 0).toFixed(2)}`, pw - margin, y, { align: 'right' });
        y += 5;
      } else if (order.delivery_fee === 0) {
        doc.setTextColor(16, 185, 129);
        doc.text('Envío', margin, y);
        doc.text('¡GRATIS!', pw - margin, y, { align: 'right' });
        doc.setTextColor(51, 51, 51);
        y += 5;
      }

      if (order.discount > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text('Descuento', margin, y);
        doc.text(`-$${(order.discount || 0).toFixed(2)}`, pw - margin, y, { align: 'right' });
        doc.setTextColor(51, 51, 51);
        y += 5;
      }

      // Total Box
      doc.setFillColor(232, 41, 74);
      doc.roundedRect(margin, y, pw - 2 * margin, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL A PAGAR', margin + 2, y + 4);
      doc.setFontSize(12);
      doc.text(`$${(order.total || 0).toFixed(2)}`, pw - margin - 2, y + 4, { align: 'right' });
      y += 16;

      // Payment Info
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Método: ${order.payment_method}`, margin, y);
      if (order.card_last4) {
        doc.text(`Tarjeta: •••• ${order.card_last4}`, pw - margin, y, { align: 'right' });
      }
      y += 5;

      // Loyalty Points
      if (order.loyalty_points_earned && order.loyalty_points_earned > 0) {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(margin, y, pw - 2 * margin, 10, 2, 2, 'F');
        doc.setTextColor(146, 64, 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`⭐ +${order.loyalty_points_earned} puntos Fresitas Club`, pw / 2, y + 6, { align: 'center' });
        y += 14;
      }

      // Footer
      doc.setDrawColor(232, 41, 74);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 4;
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('Preparadas con amor', pw / 2, y + 2, { align: 'center' });
      doc.text('Fresitas G&F — Gracias por elegirnos', pw / 2, y + 5, { align: 'center' });

      doc.save(`fresitas_${order.tracking_code}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-card rounded-3xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Buttons */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-poppins font-bold text-sm">Recibo del Pedido</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
            <Button size="sm" className="rounded-xl gap-1.5 text-xs bg-strawberry text-white hover:bg-strawberry/90" onClick={handleDownloadPDF}>
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 space-y-4">
          {/* Premium Header */}
          <div className="text-center bg-gradient-to-br from-strawberry via-pink-500 to-rose-600 rounded-3xl p-6 text-white shadow-lg">
            {/* Logo */}
            <div className="flex justify-center mb-3">
              {!logoError && storeSettings?.logo_url ? (
                <img 
                  src={storeSettings.logo_url} 
                  alt="Logo" 
                  className="h-16 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <img 
                  src="https://media.base44.com/images/public/69f98745fea6885f71e28a28/c3d413035_853bb520-92b6-4829-992f-79cceb7ff54c.png" 
                  alt="Fresitas G&F" 
                  className="h-16 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <p className="text-sm text-pink-100 tracking-widest font-medium mb-1">RECIBO OFICIAL DE COMPRA</p>
            <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 inline-block border border-white/30">
              <p className="font-mono font-black tracking-widest text-lg"># {order.tracking_code}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted rounded-2xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1 font-semibold">ESTADO</p>
              <span
                className="inline-block text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <div className="bg-muted rounded-2xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1 font-semibold">PEDIDO #</p>
              <p className="text-xs font-mono font-black text-strawberry">{order.tracking_code}</p>
            </div>
          </div>

          {/* Customer Info - Enhanced */}
          <div className="bg-gradient-to-br from-cream to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-4 space-y-2.5 text-sm border border-pink-200 dark:border-pink-800">
            <div className="flex items-center gap-3 font-semibold">
              <div className="w-8 h-8 bg-strawberry text-white rounded-full flex items-center justify-center text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-bold">{order.customer_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-strawberry flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">{order.customer_phone || 'No proporcionado'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-strawberry flex-shrink-0 mt-1" />
              <div>
                <p className="text-xs text-muted-foreground">Dirección de Entrega</p>
                <p className="font-medium text-xs">{order.customer_address}</p>
              </div>
            </div>
            {order.delivery_time_preference && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-strawberry flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Entrega Preferida</p>
                  <p className="font-medium">{order.delivery_time_preference}</p>
                </div>
              </div>
            )}
            {order.notes && (
              <div className="pt-2 border-t border-pink-200 dark:border-pink-700">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-xs italic">"{order.notes}"</p>
              </div>
            )}
          </div>

          {/* Items - Premium Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-strawberry" />
              <p className="text-xs font-bold text-strawberry uppercase tracking-widest">Productos Pedidos</p>
              <span className="ml-auto text-xs font-bold bg-strawberry/10 text-strawberry px-2 py-1 rounded-full">
                {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2.5">
              {(order.items || []).map((item, i) => (
                <div key={i} className="bg-muted/50 rounded-2xl p-3 border border-border hover:border-strawberry/30 transition-colors">
                  <div className="flex items-start gap-3 mb-2">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-strawberry/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-strawberry" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{item.name}</p>
                      {item.size && <p className="text-xs text-muted-foreground">Tamaño: {item.size}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm text-strawberry">${(item.price || 0).toFixed(2)}</p>
                      <p className="text-xs bg-strawberry/10 text-strawberry px-2 py-1 rounded-full font-semibold">x{item.quantity}</p>
                    </div>
                  </div>
                  {(item.toppings?.length > 0 || item.size) && (
                    <div className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2 mt-2">
                      {item.size && <p>Tamaño: <span className="font-medium">{item.size}</span></p>}
                      {item.toppings?.length > 0 && <p>Extras: <span className="font-medium">{item.toppings.join(', ')}</span></p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Premium Totals */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-4 space-y-3 border border-border">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Envío</span>
                <span className="font-medium">
                  {order.delivery_fee === 0 ? (
                    <span className="text-green-600 font-bold">¡GRATIS!</span>
                  ) : (
                    `$${(order.delivery_fee || 0).toFixed(2)}`
                  )}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-semibold">Descuento</span>
                  <span className="font-bold text-green-600">-${(order.discount || 0).toFixed(2)}</span>
                </div>
              )}
              {order.promo_code && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Código: {order.promo_code}</span>
                  <Badge variant="outline" className="text-green-600 border-green-300">Aplicado</Badge>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-lg font-bold">Total a Pagar</span>
              <span className="text-2xl font-black text-strawberry">${(order.total || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Loyalty Points */}
          {order.loyalty_points_earned > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-3"
            >
              <Star className="w-6 h-6 text-amber-500 flex-shrink-0 fill-amber-400" />
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wide">Puntos Fresitas Club</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">+{order.loyalty_points_earned} puntos</p>
              </div>
            </motion.div>
          )}

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-muted-foreground mb-1">Método de Pago</p>
              <p className="font-bold text-sm capitalize">{order.payment_method}</p>
              {order.card_last4 && <p className="text-muted-foreground text-xs mt-1">•••• {order.card_last4}</p>}
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-muted-foreground mb-1">Fecha & Hora</p>
              <p className="font-bold text-sm">
                {new Date(order.created_date || Date.now()).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(order.created_date || Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-4 text-center space-y-1">
            <p className="text-sm font-poppins font-bold text-strawberry">Fresitas G&F</p>
             <p className="text-xs text-muted-foreground italic">Preparadas con amor</p>
            <p className="text-xs text-muted-foreground">Gracias por tu compra. ¡Esperamos verte pronto!</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}