"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useApi, PlanConfig, Subscription, Payment } from "@/lib/api-client";
import { toast } from "sonner";
import {
  CreditCard,
  Check,
  X,
  Crown,
  Zap,
  Building2,
  Users,
  Clock,
  Loader2,
  ExternalLink,
  Wallet,
  Shield,
  Mail,
  Bitcoin,
  Landmark,
} from "lucide-react";
import { format } from "date-fns";
import { BillingSkeleton } from "@/components/dashboard/skeletons";

export default function BillingPage() {
  const { user } = useUser();
  const api = useApi();

  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "coinbase">("stripe");

  const currentPlan = (user?.publicMetadata?.plan as string | undefined) || "FREE";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [plansData, subData, historyData] = await Promise.all([
        api.payments.getPlans(),
        api.payments.getSubscription(),
        api.payments.getHistory(),
      ]);
      setPlans(plansData);
      setSubscription(subData);
      setHistory(historyData);
    } catch (error) {
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(plan: "PRO" | "BUSINESS" | "ENTERPRISE") {
    try {
      setCheckoutLoading(plan);
      
      if (paymentProvider === "coinbase") {
        const session = await api.payments.createCheckoutCrypto(plan, billingInterval);
        // Redirect to Coinbase Commerce checkout
        window.location.href = session.checkoutUrl;
      } else {
        const session = await api.payments.createCheckout(plan, billingInterval);
        // Redirect to Stripe checkout
        window.location.href = session.checkoutUrl;
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to create checkout");
      setCheckoutLoading(null);
    }
  }

  async function handleManageBilling() {
    try {
      setPortalLoading(true);
      const { portalUrl } = await api.payments.createPortalSession();
      window.location.href = portalUrl;
    } catch (error) {
      toast.error((error as Error).message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  }

  async function handleCancelSubscription(immediate: boolean) {
    if (!confirm(immediate 
      ? "Are you sure? Your subscription will be cancelled immediately and you'll be downgraded to FREE."
      : "Your subscription will be cancelled at the end of the billing period. Continue?")) {
      return;
    }

    try {
      await api.payments.cancelSubscription(immediate);
      toast.success(immediate ? "Subscription cancelled" : "Subscription will cancel at period end");
      loadData();
    } catch (error) {
      toast.error((error as Error).message || "Failed to cancel subscription");
    }
  }

  if (loading) {
    return <BillingSkeleton />;
  }

  const freePlan = plans.find((p) => p.plan === "FREE");
  const proPlan = plans.find((p) => p.plan === "PRO");
  const businessPlan = plans.find((p) => p.plan === "BUSINESS");
  const enterprisePlan = plans.find((p) => p.plan === "ENTERPRISE");

  // Helper function to calculate discount percentage
  const getYearlyDiscount = (monthly: number, yearly: number) => {
    if (!monthly || !yearly) return 0;
    return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Billing & Subscription
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan and payment history
        </p>
      </div>

      {/* Current Subscription - Only show for paid plans (PRO, BUSINESS, ENTERPRISE) */}
      {subscription && ["PRO", "BUSINESS", "ENTERPRISE"].includes(subscription.plan) && (
        <div className="mb-8 rounded-xl border border-white/8 bg-white/3 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Current Plan</h2>
                <p className="text-sm text-muted-foreground">
                  {subscription.plan} • {subscription.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {subscription.cancelAtPeriodEnd ? (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
                  Cancelling at period end
                </span>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelSubscription(false)}
                  >
                    Cancel at period end
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelSubscription(true)}
                  >
                    Cancel now
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/8">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Billing Period</p>
              <p className="text-sm font-medium">
                {subscription.billingInterval === "year" ? "Yearly" : "Monthly"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Period</p>
              <p className="text-sm font-medium">
                {subscription.currentPeriodStart && subscription.currentPeriodEnd ? (
                  <>
                    {format(new Date(subscription.currentPeriodStart), "MMM d")} - {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                  </>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p className="text-sm font-medium">
                ${subscription.amountPaid} {subscription.currency}
              </p>
            </div>
          </div>

          {/* Manage Billing Button */}
          <div className="mt-4 pt-4 border-t border-white/8">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          </div>
        </div>
      )}

      {/* Billing Interval & Payment Provider Toggle */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
        {/* Billing Interval */}
        <div className="inline-flex items-center p-1 rounded-xl border border-white/8 bg-white/3">
          <button
            onClick={() => setBillingInterval("month")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingInterval === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              billingInterval === "year"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              billingInterval === "year" ? "bg-primary-foreground/20" : "bg-green-500/20 text-green-400"
            }`}>
              Save 17.5%
            </span>
          </button>
        </div>

        {/* Payment Provider */}
        <div className="inline-flex items-center p-1 rounded-xl border border-white/8 bg-white/3">
          <button
            onClick={() => setPaymentProvider("stripe")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              paymentProvider === "stripe"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Card / Bank
          </button>
          <button
            onClick={() => setPaymentProvider("coinbase")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              paymentProvider === "coinbase"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bitcoin className="h-4 w-4" />
            Crypto
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-12">
        {/* Free Plan */}
        {freePlan && (
          <div className={`relative rounded-2xl border p-5 transition-all flex flex-col h-full ${
            currentPlan === "FREE"
              ? "border-primary bg-primary/5"
              : "border-white/8 bg-white/3 hover:border-white/12"
          }`}>
            {currentPlan === "FREE" && (
              <div className="absolute -top-3 left-4">
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Current Plan
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-yellow-400" />
                <h3 className="text-lg font-bold">{freePlan.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{freePlan.description}</p>
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold">Free</p>
              <p className="text-xs text-muted-foreground">Forever</p>
            </div>

            <ul className="space-y-2 mb-4 flex-1">
              {freePlan.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-xs">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-3 w-3 text-green-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-auto"
              variant="secondary"
              disabled={currentPlan === "FREE"}
            >
              {currentPlan === "FREE" ? "Current Plan" : "Downgrade"}
            </Button>
          </div>
        )}

        {/* Pro Plan */}
        {proPlan && (
          <div className={`relative rounded-2xl border p-5 transition-all flex flex-col h-full ${
            currentPlan === "PRO"
              ? "border-primary bg-primary/5"
              : "border-white/8 bg-white/3 hover:border-white/12"
          }`}>
            {currentPlan === "PRO" && (
              <div className="absolute -top-3 left-4">
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Current Plan
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-400" />
                <h3 className="text-lg font-bold">{proPlan.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{proPlan.description}</p>
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold">
                ${billingInterval === "year" ? proPlan.price.yearly : proPlan.price.monthly}
              </p>
              <p className="text-xs text-muted-foreground">
                /{billingInterval === "year" ? "year" : "month"}
                {billingInterval === "year" && (
                  <span className="ml-1 text-green-400">
                    (Save {getYearlyDiscount(proPlan.price.monthly, proPlan.price.yearly)}%)
                  </span>
                )}
              </p>
            </div>

            <ul className="space-y-2 mb-4 flex-1">
              {proPlan.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-xs">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-3 w-3 text-green-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-auto"
              variant={currentPlan === "PRO" ? "secondary" : "default"}
              disabled={currentPlan === "PRO" || checkoutLoading === "PRO"}
              onClick={() => handleSubscribe("PRO")}
            >
              {checkoutLoading === "PRO" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentPlan === "PRO" ? (
                "Current Plan"
              ) : (
                <>
                  Subscribe <CreditCard className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Business Plan */}
        {businessPlan && (
          <div className={`relative rounded-2xl border p-5 transition-all flex flex-col h-full ${
            currentPlan === "BUSINESS"
              ? "border-primary bg-primary/5"
              : "border-white/8 bg-white/3 hover:border-white/12"
          }`}>
            {currentPlan === "BUSINESS" && (
              <div className="absolute -top-3 left-4">
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Current Plan
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-indigo-400" />
                <h3 className="text-lg font-bold">{businessPlan.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{businessPlan.description}</p>
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold">
                ${billingInterval === "year" ? businessPlan.price.yearly : businessPlan.price.monthly}
              </p>
              <p className="text-xs text-muted-foreground">
                /{billingInterval === "year" ? "year" : "month"}
                {billingInterval === "year" && (
                  <span className="ml-1 text-green-400">
                    (Save {getYearlyDiscount(businessPlan.price.monthly, businessPlan.price.yearly)}%)
                  </span>
                )}
              </p>
            </div>

            <ul className="space-y-2 mb-4 flex-1">
              {businessPlan.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-xs">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-3 w-3 text-green-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-auto"
              variant={currentPlan === "BUSINESS" ? "secondary" : "default"}
              disabled={currentPlan === "BUSINESS" || checkoutLoading === "BUSINESS"}
              onClick={() => handleSubscribe("BUSINESS")}
            >
              {checkoutLoading === "BUSINESS" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentPlan === "BUSINESS" ? (
                "Current Plan"
              ) : (
                <>
                  Subscribe <CreditCard className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Enterprise Plan */}
        {enterprisePlan && (
          <div className={`relative rounded-2xl border p-5 transition-all flex flex-col h-full ${
            currentPlan === "ENTERPRISE"
              ? "border-primary bg-primary/5"
              : "border-white/8 bg-white/3 hover:border-white/12"
          }`}>
            {currentPlan === "ENTERPRISE" && (
              <div className="absolute -top-3 left-4">
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Current Plan
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-purple-400" />
                <h3 className="text-lg font-bold">{enterprisePlan.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{enterprisePlan.description}</p>
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold">Custom</p>
              <p className="text-xs text-muted-foreground">Contact Sales</p>
            </div>

            <ul className="space-y-2 mb-4 flex-1">
              {enterprisePlan.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-xs">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-3 w-3 text-green-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-auto"
              variant={currentPlan === "ENTERPRISE" ? "secondary" : "outline"}
              disabled={currentPlan === "ENTERPRISE"}
              onClick={() => window.location.href = "mailto:sales@zeroone.ai?subject=Enterprise Plan Inquiry"}
            >
              {currentPlan === "ENTERPRISE" ? (
                "Current Plan"
              ) : (
                <>
                  Contact Sales <Mail className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Payment History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment History
            </h2>
          </div>
          
          <ul className="divide-y divide-white/6">
            {history.map((payment) => (
              <li key={payment.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      payment.status === "COMPLETED"
                        ? "bg-green-500/10 text-green-400"
                        : payment.status === "PENDING"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {payment.status === "COMPLETED" ? (
                        <Check className="h-4 w-4" />
                      ) : payment.status === "PENDING" ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        ${payment.amount} {payment.currency}
                        {payment.cryptoAmount && (
                          <span className="text-muted-foreground ml-1">
                            ({payment.cryptoAmount} {payment.cryptoCurrency})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.createdAt ? format(new Date(payment.createdAt), "MMM d, yyyy") : "N/A"}
                        {payment.paymentMethod && (
                          <span className="ml-2 capitalize">• {payment.paymentMethod}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    payment.status === "COMPLETED"
                      ? "bg-green-500/10 text-green-400"
                      : payment.status === "PENDING"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payment Methods Info */}
      <div className="mt-8 rounded-xl border border-white/8 bg-white/3 p-6">
        {paymentProvider === "stripe" ? (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Secure Payments with Stripe</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, Amex, JCB), Apple Pay, Google Pay, and bank transfers via Stripe. 
                All payments are securely processed and PCI compliant.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Bitcoin className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Crypto Payments with Coinbase Commerce</h3>
              <p className="text-sm text-muted-foreground">
                We accept Bitcoin (BTC), Ethereum (ETH), USDC, Solana (SOL), and 10+ other cryptocurrencies via Coinbase Commerce. 
                Non-custodial and secure.
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-6 grid grid-cols-3 gap-4">
          {paymentProvider === "stripe" ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <CreditCard className="h-4 w-4" />
                </div>
                Credit Cards
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Landmark className="h-4 w-4" />
                </div>
                Bank Transfer
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Check className="h-4 w-4 text-green-400" />
                </div>
                PCI Compliant
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Bitcoin className="h-4 w-4" />
                </div>
                Bitcoin
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Wallet className="h-4 w-4" />
                </div>
                ETH / USDC
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Check className="h-4 w-4 text-green-400" />
                </div>
                Non-custodial
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
