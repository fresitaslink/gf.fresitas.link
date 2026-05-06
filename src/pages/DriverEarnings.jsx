import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Wallet, TrendingUp, Clock, DollarSign, CreditCard } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

export default function DriverEarnings() {
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      
      const earningsData = await base44.entities.DriverEarnings.filter(
        { driver_email: user.email },
        '-created_date',
        1
      );

      if (earningsData.length > 0) {
        setEarnings(earningsData[0]);

        const txns = await base44.entities.DriverTransaction.filter(
          { driver_email: user.email },
          '-created_date',
          50
        );
        setTransactions(txns);
      } else {
        setEarnings({
          driver_email: user.email,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          pending_balance: 0,
          total_deliveries: 0,
          avg_earnings_per_delivery: 0
        });
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast.error('Error loading earnings');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < (earnings?.min_withdrawal || 50)) {
      toast.error(`Minimum withdrawal: $${earnings?.min_withdrawal || 50}`);
      return;
    }

    if (parseFloat(withdrawAmount) > earnings.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setWithdrawing(true);
      const user = await base44.auth.me();

      // Create withdrawal transaction
      await base44.entities.DriverTransaction.create({
        driver_email: user.email,
        amount: -Math.abs(parseFloat(withdrawAmount)),
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal to ${earnings.payment_method}`
      });

      // Update balance
      await base44.entities.DriverEarnings.update(earnings.id, {
        balance: earnings.balance - parseFloat(withdrawAmount),
        total_withdrawn: earnings.total_withdrawn + parseFloat(withdrawAmount)
      });

      toast.success(`Withdrawal of $${withdrawAmount} requested`);
      setWithdrawAmount('');
      fetchEarningsData();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin">⏳</div></div>;
  if (!earnings) return <div className="text-center py-10">No earnings data</div>;

  const todayEarnings = transactions
    .filter(t => new Date(t.created_date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + (t.type === 'delivery' ? t.amount : 0), 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Mis Ganancias</h1>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Disponible</p>
                <p className="text-3xl font-bold text-strawberry">${earnings.balance?.toFixed(2)}</p>
              </div>
              <Wallet className="w-10 h-10 text-strawberry opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Hoy</p>
                <p className="text-3xl font-bold text-accent">${todayEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-accent opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Ganado</p>
                <p className="text-3xl font-bold text-primary">${earnings.total_earned?.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-primary opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Entregas</p>
                <p className="text-3xl font-bold">{earnings.total_deliveries}</p>
              </div>
              <Clock className="w-10 h-10 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Withdrawal Section */}
        <Card className="p-6 mb-8 bg-gradient-to-br from-secondary to-card">
          <h2 className="text-xl font-bold mb-4">Retirar Ganancias</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">Cantidad</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="50"
                min={earnings.min_withdrawal || 50}
                max={earnings.balance}
                className="w-full px-4 py-2 border border-input rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo: ${earnings.min_withdrawal || 50} | Disponible: ${earnings.balance?.toFixed(2)}
              </p>
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount}
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {withdrawing ? 'Procesando...' : 'Retirar'}
            </Button>
          </div>
        </Card>

        {/* Chart */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={transactions.slice(0, 7).reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="created_date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="hsl(var(--strawberry))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Transaction History */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Historial de Transacciones</h2>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-muted-foreground">Sin transacciones aún</p>
            ) : (
              transactions.slice(0, 20).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 border-b border-border">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{tx.type}</p>
                    {tx.order_id && <p className="text-xs text-muted-foreground">Pedido: {tx.order_id}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}${tx.amount?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}