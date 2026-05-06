import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TipSelector({ onTipChange, subtotal = 0 }) {
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTip, setCustomTip] = useState('');

  const quickTips = [
    { label: '$5', value: 5 },
    { label: '$10', value: 10 },
    { label: '$20', value: 20 },
  ];

  const percentageTips = [
    { label: '10%', percent: 0.10 },
    { label: '15%', percent: 0.15 },
    { label: '20%', percent: 0.20 },
  ];

  const handleQuickTip = (amount) => {
    setSelectedTip(amount);
    setCustomTip('');
    onTipChange(amount);
  };

  const handlePercentTip = (percent) => {
    const amount = Math.round(subtotal * percent * 100) / 100;
    setSelectedTip(amount);
    setCustomTip('');
    onTipChange(amount);
  };

  const handleCustomTip = (value) => {
    const amount = parseFloat(value) || 0;
    setCustomTip(value);
    setSelectedTip(null);
    onTipChange(amount);
  };

  const currentTip = customTip ? parseFloat(customTip) || 0 : selectedTip || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20 border border-pink-200 dark:border-pink-800 rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        <h4 className="font-semibold text-foreground">Propina para el Repartidor</h4>
      </div>

      {/* Quick Tips */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {quickTips.map(tip => (
          <Button
            key={tip.label}
            onClick={() => handleQuickTip(tip.value)}
            variant={selectedTip === tip.value ? 'default' : 'outline'}
            className={`h-10 text-sm font-semibold rounded-lg transition-all ${
              selectedTip === tip.value 
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                : ''
            }`}
          >
            {tip.label}
          </Button>
        ))}
      </div>

      {/* Percentage Tips */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Porcentaje del subtotal:</p>
        <div className="grid grid-cols-3 gap-2">
          {percentageTips.map(tip => (
            <Button
              key={tip.label}
              onClick={() => handlePercentTip(tip.percent)}
              variant={selectedTip === Math.round(subtotal * tip.percent * 100) / 100 ? 'default' : 'outline'}
              className={`h-10 text-sm rounded-lg transition-all ${
                selectedTip === Math.round(subtotal * tip.percent * 100) / 100
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                  : ''
              }`}
            >
              {tip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Tip */}
      <div className="space-y-2">
        <Label className="text-xs">Monto personalizado</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={customTip}
              onChange={e => handleCustomTip(e.target.value)}
              placeholder="0.00"
              className="pl-8 h-10 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {currentTip > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-white dark:bg-black/30 rounded-lg border border-pink-200 dark:border-pink-800"
        >
          <p className="text-sm text-center">
            <span className="font-bold text-red-500">${currentTip.toFixed(2)}</span>
            <span className="text-muted-foreground ml-2">
              ({((currentTip / subtotal) * 100).toFixed(0)}% del subtotal)
            </span>
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}