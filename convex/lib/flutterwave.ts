const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    flw_ref?: string;
    status: string;
    amount: number;
    currency: string;
    charged_amount?: number;
  };
}

function getFlutterwaveSecretKey(): string {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    throw new Error("Flutterwave secret key is not configured.");
  }
  return secret;
}

export async function verifyFlutterwaveTransaction(transactionId: number | string) {
  const secret = getFlutterwaveSecretKey();
  const response = await fetch(
    `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Flutterwave verification failed (${response.status}): ${errorText}`
    );
  }

  const payload = (await response.json()) as FlutterwaveVerifyResponse;
  if (!payload.data) {
    throw new Error(`Flutterwave verification missing data: ${payload.message}`);
  }
  return payload.data;
}
