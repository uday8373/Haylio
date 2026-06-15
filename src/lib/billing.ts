import { paypalEnabled } from "./paypal";
import { cashfreeEnabled } from "./cashfree";

/** True when any billing provider is configured (paywall is enforced). */
export const billingEnabled = paypalEnabled || cashfreeEnabled;
