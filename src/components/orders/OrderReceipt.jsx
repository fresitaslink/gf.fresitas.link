import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, X, CheckCircle, MapPin, Clock, CreditCard, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
      const doc = new jsPDF({ format: 'a5', unit: 'mm' });
      const pw = 148;

      // Header
      doc.setFillColor(232, 41, 74);
      doc.rect(0, 0, pw, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Fresitas G&F', pw / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Recibo Oficial de Compra', pw / 2, 22, { align: 'center' });
      doc.text(`Pedido #${order.tracking_code}`, pw / 2, 30, { align: 'center' });

      let y = 45;
      doc.setTextColor(51, 51, 51);

      // Order Info
      doc.setFillColor(253, 232, 236);
      doc.roundedRect(8, y, pw - 16, 28, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Información del Pedido', 14, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Cliente: ${order.customer_name}`, 14, y + 14);
      doc.text(`Tel: ${order.customer_phone || '—'}`, 14, y + 20);
      doc.text(`Dirección: ${(order.customer_address || '').substring(0, 40)}`, 14, y + 26);
      y += 36;

      // Items
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Productos', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setDrawColor(240, 240, 240);

      (order.items || []).forEach(item => {
        doc.line(8, y, pw - 8, y);
        y += 4;
        doc.text(`${item.name} x${item.quantity}`, 14, y);
        doc.text(`$${(item.price || 0).toFixed(2)}`, pw - 14, y, { align: 'right' });
        y += 7;
      });

      // Totals
      y += 4;
      doc.line(8, y, pw - 8, y);
      y += 6;
      if (order.delivery_fee) {
        doc.text('Envío:', 14, y);
        doc.text(`$${(order.delivery_fee || 0).toFixed(2)}`, pw - 14, y, { align: 'right' });
        y += 6;
      }
      if (order.discount > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text('Descuento:', 14, y);
        doc.text(`-$${(order.discount || 0).toFixed(2)}`, pw - 14, y, { align: 'right' });
        doc.setTextColor(51, 51, 51);
        y += 6;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(232, 41, 74);
      doc.text('TOTAL:', 14, y);
      doc.text(`$${(order.total || 0).toFixed(2)}`, pw - 14, y, { align: 'right' });
      y += 10;

      // Payment
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Método de pago: ${order.payment_method}`, 14, y);
      doc.text(`Fecha: ${new Date(order.created_date || Date.now()).toLocaleDateString('es-MX')}`, pw - 14, y, { align: 'right' });
      y += 12;

      // Loyalty Points
      if (order.loyalty_points_earned) {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(8, y, pw - 16, 12, 3, 3, 'F');
        doc.setTextColor(146, 64, 14);
        doc.setFont('helvetica', 'bold');
        doc.text(`+${order.loyalty_points_earned} puntos Fresitas Club ganados`, pw / 2, y + 8, { align: 'center' });
        y += 18;
      }

      // Footer
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Gracias por elegir Fresitas G&F — Preparadas con amor', pw / 2, y, { align: 'center' });

      doc.save(`recibo_fresitas_${order.tracking_code}.pdf`);
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
          {/* Header */}
          <div className="text-center bg-gradient-to-br from-strawberry to-pink-500 rounded-2xl p-5 text-white">
            <p className="text-2xl font-black font-poppins">🍓 Fresitas G&F</p>
            <p className="text-pink-100 text-xs mt-1">Recibo Oficial de Compra</p>
            <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-block">
              <p className="font-mono font-black tracking-widest text-sm">#{order.tracking_code}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Estado:</span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}
            >
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>

          {/* Customer Info */}
          <div className="bg-muted rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span className="font-medium">{order.customer_name}</span>
            </div>
            {order.customer_phone && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{order.customer_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{order.customer_address}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CreditCard className="w-3 h-3 flex-shrink-0" />
              <span>{order.payment_method}</span>
              {order.card_last4 && <span>•••• {order.card_last4}</span>}
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Productos</p>
            <div className="space-y-2">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-strawberry/10 flex items-center justify-center text-sm flex-shrink-0">🍓</div>
                  )}
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{item.name}</p>
                    {item.size && <p className="text-xs text-muted-foreground">{item.size}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">${(item.price || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${(order.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span>{order.delivery_fee === 0 ? '¡Gratis!' : `$${(order.delivery_fee || 0).toFixed(2)}`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>-${(order.discount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-border pt-2">
              <span>Total</span>
              <span className="text-strawberry">${(order.total || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Loyalty Points */}
          {order.loyalty_points_earned > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                +{order.loyalty_points_earned} puntos Fresitas Club ganados
              </span>
            </div>
          )}

          {/* Date */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_date || Date.now()).toLocaleDateString('es-MX', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Preparadas con amor 🍓</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}