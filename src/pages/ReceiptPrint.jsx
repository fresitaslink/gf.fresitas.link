import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReceiptPrint() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get('id');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (!orderId) {
          setLoading(false);
          return;
        }
        const o = await base44.entities.Order.get(orderId);
        setOrder(o);
      } catch (err) {
        console.error('Error loading order:', err);
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <p className="text-muted-foreground">Recibo no encontrado</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-8 print:p-0">
      {/* Print Button (hidden on print) */}
      <div className="max-w-2xl mx-auto mb-6 print:hidden flex gap-2">
        <Button onClick={handlePrint} className="gap-2 flex-1">
          <Printer className="w-4 h-4" />
          Imprimir Recibo
        </Button>
      </div>

      {/* Receipt */}
      <div className="max-w-2xl mx-auto bg-white text-black p-8 rounded-lg shadow-lg print:shadow-none print:rounded-none print:p-0">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold">Fresitas G&F</h1>
          <p className="text-sm text-gray-600">Recibo de Compra</p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-600">Número de Pedido</p>
            <p className="font-bold text-lg">#{order.tracking_code}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Fecha</p>
            <p className="font-bold">{new Date(order.created_date).toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-gray-50 p-4 rounded mb-6 text-sm">
          <p className="font-bold mb-2">Cliente</p>
          <p>{order.customer_name}</p>
          <p>{order.customer_phone}</p>
          <p className="text-gray-600 mt-2">{order.customer_address}</p>
        </div>

        {/* Items */}
        <div className="mb-6">
          <p className="font-bold mb-3">Ítems</p>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300">
              <tr>
                <th className="text-left py-2">Producto</th>
                <th className="text-center py-2">Cantidad</th>
                <th className="text-right py-2">Precio</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3">
                    {item.name}
                    {item.size && <p className="text-xs text-gray-600">{item.size}</p>}
                    {item.toppings?.length > 0 && (
                      <p className="text-xs text-gray-600">{item.toppings.join(', ')}</p>
                    )}
                  </td>
                  <td className="text-center py-3">{item.quantity}</td>
                  <td className="text-right py-3">${item.price?.toFixed(2)}</td>
                  <td className="text-right py-3 font-semibold">
                    ${(item.price * item.quantity)?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-black pt-4 space-y-2 text-sm font-semibold">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${order.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Entrega:</span>
            <span>${order.delivery_fee?.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Descuento:</span>
              <span>-${order.discount?.toFixed(2)}</span>
            </div>
          )}
          {order.tip_amount > 0 && (
            <div className="flex justify-between">
              <span>Propina:</span>
              <span>${order.tip_amount?.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-black pt-2 mt-2 flex justify-between text-lg">
            <span>Total:</span>
            <span>${order.total?.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 p-4 rounded mt-6 text-sm">
          <p className="font-bold mb-2">Método de Pago</p>
          <p className="capitalize">{order.payment_method === 'efectivo' ? '💵 Efectivo' : order.payment_method === 'tarjeta' ? '💳 Tarjeta' : '🏦 Transferencia'}</p>
          <p className="text-gray-600">
            {order.payment_status === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
          </p>
        </div>

        {/* Status */}
        {order.status && (
          <div className="mt-6 p-4 border-2 border-primary rounded text-center">
            <p className="text-gray-600 text-sm">Estado del Pedido</p>
            <p className="font-bold text-lg capitalize">{order.status.replace('_', ' ')}</p>
          </div>
        )}

        {/* Driver Info */}
        {order.assigned_driver_name && (
          <div className="mt-6 p-4 bg-blue-50 rounded text-sm">
            <p className="font-bold mb-1">Repartidor</p>
            <p>{order.assigned_driver_name}</p>
            {order.assigned_driver_rating && (
              <p className="text-gray-600">⭐ {order.assigned_driver_rating.toFixed(1)} (${'{0}'})</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 mt-8 pt-4 border-t border-gray-300">
          <p>Gracias por tu compra 🍓</p>
          <p>www.fresitas.app | +1-800-FRESITAS</p>
        </div>
      </div>
    </div>
  );
}