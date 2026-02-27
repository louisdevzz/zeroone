#!/usr/bin/env tsx
/**
 * Stripe Test Script
 * 
 * Helper script to test Stripe integration locally
 * 
 * Usage:
 *   tsx scripts/stripe-test.ts              # Show help
 *   tsx scripts/stripe-test.ts test-card    # Test card payment
 *   tsx scripts/stripe-test.ts test-crypto  # Test crypto (USDC) payment
 *   tsx scripts/stripe-test.ts trigger      # Trigger webhook events
 */

import { stripeService } from "../src/services/stripe.service";

const COMMAND = process.argv[2];

async function testCardPayment() {
  console.log("🧪 Testing card payment flow...\n");
  
  const testUserId = "test-user-123";
  const testEmail = "test@example.com";
  
  try {
    // Create customer
    console.log("1. Creating Stripe customer...");
    const customerId = await stripeService.createOrGetCustomer(testUserId);
    console.log(`   ✅ Customer created: ${customerId}\n`);
    
    // Create checkout session
    console.log("2. Creating checkout session...");
    const { session, payment } = await stripeService.createCheckoutSession(
      testUserId,
      "PRO",
      "month",
      "http://localhost:3000/billing/success",
      "http://localhost:3000/billing/cancel"
    );
    
    console.log(`   ✅ Checkout session created:`);
    console.log(`      - Session ID: ${session.id}`);
    console.log(`      - URL: ${session.url}`);
    console.log(`      - Payment ID: ${payment.id}\n`);
    
    console.log("3. Next steps:");
    console.log(`   - Visit checkout URL: ${session.url}`);
    console.log("   - Use test card: 4242 4242 4242 4242");
    console.log("   - Any future expiry date");
    console.log("   - Any 3-digit CVC\n");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

async function showHelp() {
  console.log(`
Stripe Test Helper
==================

Commands:
  test-card    - Test card payment flow
  test-crypto  - Test crypto (USDC) payment flow  
  trigger      - Show how to trigger webhook events
  help         - Show this help

Prerequisites:
  1. Backend server running: pnpm dev
  2. Stripe CLI forwarding: pnpm stripe:webhook

Test Card Numbers:
  Success: 4242 4242 4242 4242
  Declined: 4000 0000 0000 9995

Examples:
  tsx scripts/stripe-test.ts test-card
  stripe trigger checkout.session.completed
`);
}

function showTriggerHelp() {
  console.log(`
Trigger Webhook Events
======================

Make sure Stripe CLI is forwarding webhooks:
  pnpm stripe:webhook

Then in another terminal, trigger events:

# Checkout completed successfully
stripe trigger checkout.session.completed

# Payment failed
stripe trigger checkout.session.async_payment_failed

# Subscription updated
stripe trigger customer.subscription.updated

# Invoice payment succeeded
stripe trigger invoice.payment_succeeded

# Invoice payment failed
stripe trigger invoice.payment_failed

See all available events:
  stripe trigger --help
`);
}

async function main() {
  switch (COMMAND) {
    case "test-card":
      await testCardPayment();
      break;
    case "test-crypto":
      console.log("🪙 Crypto testing - use the checkout URL and select 'Pay with crypto'\n");
      await testCardPayment();
      break;
    case "trigger":
      showTriggerHelp();
      break;
    case "help":
    default:
      showHelp();
      break;
  }
}

main();
