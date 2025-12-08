import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(_req: NextRequest) {
  return new Response("facebook webhook OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validar Assinatura (Segurança)
    const signature = req.headers.get("x-hub-signature-256");
    const bodyText = await req.text(); // Ler como texto para validar o hash

    if (process.env.FB_APP_SECRET) {
      const expectedSignature = "sha256=" + crypto
        .createHmac("sha256", process.env.FB_APP_SECRET)
        .update(bodyText)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("[Webhook] Assinatura inválida. Recebido:", signature, "Esperado:", expectedSignature);
        return new Response("Forbidden: Invalid Signature", { status: 403 });
      }
    } else {
      console.warn("[Webhook] FB_APP_SECRET não configurado. Pulando validação de segurança.");
    }

    // 2. Processar Payload
    const body = JSON.parse(bodyText);
    console.log("WEBHOOK EVENT:", JSON.stringify(body, null, 2));

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error('webhook POST error', err);
    return new Response("Bad Request", { status: 400 });
  }
}
