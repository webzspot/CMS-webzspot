const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Razorpay Checkout is loaded on demand, only when the user starts an upgrade.
export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
