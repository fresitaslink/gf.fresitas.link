import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Tag, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function LoyaltyClubSection() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const perks = [
    { icon: Star, text: t.earnPoints, color: 'text-amber-300' },
    { icon: Tag, text: t.redeemPoints, color: 'text-pink-200' },
    { icon: Cake, text: t.birthdayBonus, color: 'text-pink-100' },
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-strawberry via-pink-600 to-rose-500 text-white relative overflow-hidden">
      {/* decorative bg blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6 mx-auto">
            <Star className="w-8 h-8 text-yellow-300 fill-yellow-300" />
          </div>
          <h2 className="font-poppins font-bold text-3xl sm:text-4xl mb-4">{t.joinClub}</h2>
          <p className="text-pink-100 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">{t.clubDesc}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {perks.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/15 hover:bg-white/25 transition-colors rounded-2xl p-5 backdrop-blur-sm"
                >
                  <Icon className={`w-6 h-6 ${item.color} mb-3 mx-auto`} />
                  <p className="text-sm font-medium leading-snug">{item.text}</p>
                </motion.div>
              );
            })}
          </div>

          {!user ? (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-white text-strawberry hover:bg-pink-50 font-semibold px-8 py-3 rounded-full text-lg shadow-lg"
            >
              {t.joinNow}
            </Button>
          ) : (
            <Link to="/perfil">
              <Button className="bg-white text-strawberry hover:bg-pink-50 font-semibold px-8 py-3 rounded-full text-lg shadow-lg">
                {language === 'es' ? 'Ver Mis Puntos' : 'View My Points'}
              </Button>
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}