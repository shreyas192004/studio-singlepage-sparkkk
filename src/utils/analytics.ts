import { supabase } from "@/integrations/supabase/client";

export const trackEvent = async (
  eventType: string,
  data: {
    productId?: string;
    designerId?: string;
    userId?: string;
    sessionId?: string;
    page?: string;
    path?: string;
    quantity?: number;
    total?: number;
    prompt?: string;
    style?: string;
    imageCount?: number;
    orderId?: string;
    products?: Array<{ productId: string; qty: number }>;
  } = {}
) => {
  try {
    const { error } = await (supabase as any).from("analytics_events").insert({
      event_type: eventType,
      product_id: data.productId || null,
      designer_id: data.designerId || null,
      user_id: data.userId || null,
      session_id: data.sessionId || generateSessionId(),
      page: data.page || null,
      path: data.path || window.location.pathname,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) console.error("Analytics tracking error:", error);
  } catch (err) {
    console.error("Failed to track event:", err);
  }
};

const generateSessionId = () => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};