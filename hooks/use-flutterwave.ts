 "use client";

 import { useEffect, useState } from "react";

 declare global {
   interface Window {
     FlutterwaveCheckout?: (config: Record<string, unknown>) => { close: () => void };
   }
 }

 const FLUTTERWAVE_SCRIPT_ID = "flutterwave-checkout";
 const FLUTTERWAVE_SCRIPT_SRC = "https://checkout.flutterwave.com/v3.js";

 export interface FlutterwaveCustomer {
   email: string;
   name?: string;
   phoneNumber?: string;
 }

 export interface FlutterwavePaymentResponse {
   status: string;
   tx_ref: string;
   transaction_id: number;
   flw_ref?: string;
   currency?: string;
   amount?: number;
 }

 export interface FlutterwaveCheckoutOptions {
   txRef: string;
   amount: number;
   currency: string;
   customer: FlutterwaveCustomer;
   title?: string;
   description?: string;
   meta?: Record<string, unknown>;
   onSuccess: (payment: FlutterwavePaymentResponse) => void;
   onClose?: () => void;
 }

 export function useFlutterwaveCheckout() {
   const [ready, setReady] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
     if (typeof window === "undefined") return;
     if (window.FlutterwaveCheckout) {
       setReady(true);
       return;
     }

     const existing = document.getElementById(FLUTTERWAVE_SCRIPT_ID);
     if (existing) {
       existing.addEventListener("load", () => setReady(true));
       existing.addEventListener("error", () =>
         setError("Failed to load Flutterwave checkout.")
       );
       return;
     }

     const script = document.createElement("script");
     script.id = FLUTTERWAVE_SCRIPT_ID;
     script.src = FLUTTERWAVE_SCRIPT_SRC;
     script.async = true;
     script.onload = () => setReady(true);
     script.onerror = () => setError("Failed to load Flutterwave checkout.");
     document.body.appendChild(script);
   }, []);

   const openCheckout = (options: FlutterwaveCheckoutOptions) => {
     const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
     if (!publicKey) {
       setError("Flutterwave public key is not configured.");
       return;
     }
     if (!window.FlutterwaveCheckout) {
       setError("Flutterwave checkout is not ready.");
       return;
     }

     const { customer } = options;
     const modal = window.FlutterwaveCheckout({
       public_key: publicKey,
       tx_ref: options.txRef,
       amount: options.amount,
       currency: options.currency,
       customer: {
         email: customer.email,
         name: customer.name,
         phone_number: customer.phoneNumber,
       },
       title: options.title,
       description: options.description,
       meta: options.meta,
       callback: (payment: FlutterwavePaymentResponse) => {
         options.onSuccess(payment);
         modal.close();
       },
       onclose: () => {
         options.onClose?.();
       },
     });
   };

   return { ready, error, openCheckout };
 }
