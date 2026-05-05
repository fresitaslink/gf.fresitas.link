import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Home } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function HowItWorks() {
  const { t, language } = useLanguage();

  const steps = [
    {
      icon: ShoppingBag,
      title: t.step1,
      desc: t.step1desc,
      color: 'text-strawberry',
      bg: 'bg-strawberry/10',
    },
    {
      icon: Sparkles,
      title: t.step2,
      desc: t.step2desc,
      color: 'text-chocolate',
      bg: 'bg-chocolate/10',
    },
    {
      icon: Home,
      title: t.step3,
      desc: t.step3desc,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  return (
    <section className="py-20 px-6 bg-cream dark:bg-secondary/10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-poppins font-bold text-3xl sm:text-4xl text-foreground mb-3">
            {t.howItWorks}
          </h2>
          <p className="text-muted-foreground">
            {language === 'es' ? 'Simple, rápido y delicioso' : 'Simple, fast and delicious'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center group"
              >
                <div className="relative inline-block">
                  <div className={`w-20 h-20 ${step.bg} rounded-2xl flex items-center justify-center shadow-lg mb-4 mx-auto group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className={`w-9 h-9 ${step.color}`} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-strawberry rounded-full flex items-center justify-center text-white text-sm font-bold shadow">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-poppins font-semibold text-xl text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}