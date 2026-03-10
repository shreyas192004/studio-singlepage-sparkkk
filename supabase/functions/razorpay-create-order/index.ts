// supabase/functions/razorpay-create-order/index.ts

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, apikey, X-Client-Info, x-client-info",
};

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        // CORS Preflight
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Validate request JSON
        let data;
        try {
            data = await req.json();
        } catch {
            return new Response(
                JSON.stringify({ message: "Invalid JSON body" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const { amount, currency = "INR" } = data;

        if (!amount || typeof amount !== "number" || amount <= 0) {
            return new Response(
                JSON.stringify({
                    message: "Invalid amount. Must be a number greater than 0.",
                    received: data,
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validate Razorpay keys
        const keyId = Deno.env.get("RAZORPAY_KEY_ID");
        const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

        if (!keyId || !keySecret) {
            console.error("Missing Razorpay credentials in env");
            return new Response(
                JSON.stringify({
                    message: "Server config error: Razorpay keys not found",
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Create order in Razorpay
        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Convert to paise
                currency,
                receipt: `rcpt_${Date.now()}`,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Razorpay API error:", errorBody);

            return new Response(
                JSON.stringify({
                    message: "Failed to create Razorpay order",
                    razorpayError: errorBody,
                }),
                {
                    status: response.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const order = await response.json();

        return new Response(
            JSON.stringify({
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        console.error("Unhandled error:", err);

        return new Response(
            JSON.stringify({
                message: "Unexpected server error",
                error: String(err),
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
