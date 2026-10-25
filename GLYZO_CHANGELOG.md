# GLYZO Security Changelog — Phase 0 & Phase 1

**Date:** 2026-10-25 · **Scope:** Phase 0 audit + Phase 1 permissions hardening
**App:** Fresitas Glyzo (uptight-fresitas-sweet-treats.base44.app)

## A. Files inspected

- All 31 entity schemas in `base44/entities/`
- `base44/functions/stripeWebhook/entry.ts`, `processStripePayment/entry.ts` (read-only; plan does not include backend functions)
- `src/pages/Checkout.jsx`, `Reviews.jsx`, `Challenges.jsx`, `Membership.jsx`, `RewardsStore.jsx`, `DriverEarnings.jsx`, `KDS.jsx`, `Logistica.jsx`, `DriverApp.jsx`, `App.jsx`
- `src/components/loyalty/MisRecompensas.jsx`, `src/components/admin/DriverAssignmentPanel.jsx`, `src/components/driver/DeliveryVerificationModal.jsx`
- All entity write call sites across `src/` (grep audit)

## B. Confirmed vulnerabilities

| # | Vulnerability | Severity | Status |
|---|---|---|---|
| 1 | `stripeWebhook` accepts unsigned JSON when `STRIPE_WEBHOOK_SECRET` is missing (lines 36–39) — forged payment/refund/subscription events | CRITICAL | **NOT FIXED — requires plan with backend functions** |
| 2 | `processStripePayment` trusts client-supplied `amount`, defaults currency to `mxn`, no server-side price/tax/discount verification | CRITICAL | **NOT FIXED — requires plan with backend functions** |
| 3 | No webhook event idempotency (duplicate events = duplicate financial ops) | HIGH | **NOT FIXED — requires plan with backend functions** |
| 4 | 26 of 31 entities had NO access rules — any logged-in user could read/modify any other user's profiles, points, orders, driver earnings, subscriptions, chats, notifications | CRITICAL | **FIXED** |
| 5 | Customers could set their own `loyalty_points`, `lifetime_points`, `current_level`, `total_orders` via browser | CRITICAL | **FIXED (field-level locks)** |
| 6 | Customers could create active premium `Subscription` records with discounts/multipliers from the browser (entitlement escalation) | CRITICAL | **FIXED** |
| 7 | Customers could update `payment_status`/`status`/`total` on their own orders in any state | HIGH | **FIXED (customer updates restricted to delivered orders)** |
| 8 | Drivers could self-verify `document_verified`, Stripe onboarding/payouts flags, and their own ratings/stats | HIGH | **FIXED (field-level locks)** |
| 9 | Client-side achievement self-unlock incl. `points_multiplier` (bonus-points escalation) | HIGH | **FIXED (multiplier + unlock locked to staff)** |
| 10 | Unpublished blog drafts readable by anyone | LOW | **FIXED (published-or-staff read rule)** |

## C. Code changes

**Entity access rules added (row-level + field-level):** User (added `kitchen` role), Order, CustomerProfile, LoyaltyTransaction, Subscription, Driver, DriverEarnings, DriverTransaction, DriverLocationHistory, DriverRating, DriverAssignment, DeliveryVerification, Notification, ChatMessage, Review, ReferralRecord, RewardRedemption, ChallengeCompletion, Achievement, Favorite, ScheduledOrder, Product, Ingredient, Recipe, RewardItem, DailyChallenge, BlogPost.

**Frontend:** `src/lib/marketConfig.js` (new — US/GT market foundation, USD/GTQ, no MXN default); Checkout.jsx points block made non-fatal (orders complete; points settle server-side); Reviews.jsx rating recalculation made non-fatal.

**Role model now enforced server-side:** admin, owner, manager, kitchen, delivery, user.

## D. Security improvements (how unauthorized operations are blocked)

- All row-level rules run server-side on every request — hiding UI no longer protects data.
- Customers: read/write only their own records; loyalty balance, level, order count, Stripe IDs are field-locked to staff/backend (service role bypasses locks for trusted backend functions).
- Customers can update their Order only when its status is `delivered` (rating/review) — they can no longer flip `payment_status`, `status`, or amounts on active orders.
- Delivery verification PINs: only staff/delivery roles can write.
- Drivers: read/write own records only; Stripe onboarding/verification/earnings/stats field-locked to staff.
- Subscription create/update/delete: staff only (webhook/service role maintains paid subs).
- Kitchen role: can update orders and ingredients/recipes; cannot manage payments, loyalty, or personnel.
- Public data (products, published blog posts, reviews, challenges, rewards catalog) stays publicly readable; all writes are staff-only.

## E. Tests

- ✅ App routes render with new rules (Home, Menu, Perfil, Orders, Rewards, Admin, Analytics, KDS, DriverEarnings) — no runtime errors, data loads.
- ✅ Admin write path (order update as admin) works; order create/read/delete round-trip verified on own test record, record cleaned up.
- ✅ Build passes.
- ⚠️ NOT TESTED as a non-admin customer session (automation runs as the admin/builder): the actual denial of a customer's attempt to edit points/payment fields. Rules are server-enforced by the platform, but a real customer account should verify: reward redemption, challenge claim, membership subscribe, and self-service subscription cancel now show a "pending server verification" or error message instead of succeeding client-side.
- ⚠️ NOT TESTED: invalid webhook signature, duplicate webhook events, manipulated payment amounts — the fixes live in backend functions, which the current plan cannot modify or invoke (webhook tests are also safely non-destructive only after the fix is in place).
- ⚠️ NOT TESTED: cross-country access (country config is foundation-only in this phase).

## F. Remaining problems (prioritized)

1. **CRITICAL — backend payment security (needs plan with backend functions):** remove the unsigned-JSON fallback in `stripeWebhook` (reject instead), add event idempotency, and make `processStripePayment` compute amounts/currency server-side from product data, ignoring client totals.
2. **HIGH — loyalty/subscription economics are now frozen client-side:** reward redemption, challenge point claims, membership self-subscribe/cancel, and instant checkout point-crediting need migration into backend functions (the rules now block the insecure client writes; users see a "server verification" message).
3. **HIGH — server-side order totals:** checkout still computes subtotal/total in the browser (unavoidable until backend migration).
4. **MEDIUM — MisRecompensas promo-code generation** creates PromoCodes client-side; PromoCode creation is staff-only, so this flow must move server-side.
5. **MEDIUM — rating aggregation:** product average rating is now deferred (catalog writes staff-only); add a backend recalculation on review create.

## G. Dependencies required

- **Plan with backend functions (upgrade)** — required for items F.1–F.5. No code below the backend can make payments or loyalty server-verified.
- Verified US state tax treatment (per delivery zone) and GT IVA treatment for prepared food — before charging customers.
- Google Maps API key with HTTP-referrer restrictions (server key stays secret) — Phase 4.
- Confirmation of payment processor availability for Guatemala (Stripe does not currently onboard GT merchants).

## H. Rollback

Entity rules: each `base44/entities/<Name>.jsonc` can be reverted by removing the `rls` key (and per-field `rls` blocks) — schemas are otherwise unchanged, no data migration was performed, all records preserved. Frontend: revert Checkout.jsx/Reviews.jsx try/catch wrappers and delete `src/lib/marketConfig.js`. No database or auth settings were reset; no merchant credentials changed.

## I. Next phase proposal (Phase 2 — Glyzo branding & design system)

1. Design tokens: Glyzo palette, typography, dark mode in `src/index.css` + `tailwind.config.js`.
2. Replace "Fresitas G&F" across nav, footer, checkout, receipts, emails, metadata.
3. Storefront redesign: hero, product cards, category browsing; mobile-first pass.
4. Component consolidation: unify the ~9 admin dashboards' shared UI.
5. Accessibility pass: contrast, focus states, aria labels, ES/GT-Spanish copy review.