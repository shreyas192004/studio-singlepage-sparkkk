const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, apikey, X-Client-Info, x-client-info",
};

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await req.json();

        const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
        const encoder = new TextEncoder();

        const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
        const keyData = encoder.encode(keySecret);

        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );

        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
        const expectedSignature = toHex(signatureBuffer);

        const isValid = expectedSignature === razorpay_signature;

        return new Response(
            JSON.stringify({ success: isValid }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (err) {
        console.error(err);
        return new Response(
            JSON.stringify({ success: false, message: "Verify error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
