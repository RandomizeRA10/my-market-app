import React, { useEffect, useRef } from 'react';

export default function PayPalButton({ amount, currency, onSuccess, onError, onCancel }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      return;
    }

    const paypalButtons = window.paypal.Buttons({
      createOrder: (data, actions) =>
        actions.order.create({
          purchase_units: [{
            amount: { currency_code: currency, value: amount }
          }]
        }),
      onApprove: (data, actions) =>
        actions.order.capture().then(details => {
          onSuccess && onSuccess(details);
        }),
      onError: err => {
        onError && onError(err);
      },
      onCancel: data => {
        onCancel && onCancel(data);
      }
    });

    paypalButtons.render(containerRef.current);

    return () => paypalButtons.close();
  }, [amount, currency, onSuccess, onError, onCancel]);

  return <div ref={containerRef} />;
}
