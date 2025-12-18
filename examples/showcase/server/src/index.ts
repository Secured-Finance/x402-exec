/**
 * x402-exec Showcase Server
 * Demonstrates x402x settlement for server-controlled scenarios
 *
 * Server Mode: Premium Download
 * - Server controls payment requirements and business logic
 * - Demonstrates server-side access control
 * - Uses TransferHook for simple payment processing
 *
 * Note: Most scenarios have moved to Serverless Mode (client-side only)
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { paymentMiddleware, type X402Context } from "@secured-finance/x402-hono";
import { getSupportedNetworks } from "@secured-finance/x402-core";
import { appConfig } from "./config.js";
import * as premiumDownload from "./scenarios/premium-download.js";

// Extend Hono Context to include x402 data
declare module "hono" {
  interface ContextVariableMap {
    x402: X402Context;
  }
}

const app = new Hono();

// Facilitator configuration
const facilitatorConfig = {
  url: appConfig.facilitatorUrl as `${string}://${string}`,
};

// Enable CORS for frontend
app.use(
  "/*",
  cors({
    origin: "*",
    credentials: false,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-PAYMENT"],
    exposeHeaders: ["X-PAYMENT"],
  }),
);

// Global error handler
app.onError((err, c) => {
  console.error("[Global Error Handler]", err);
  console.error("[Global Error Stack]", err.stack);
  return c.json(
    {
      error: err.message || "Internal server error",
      details: err.stack,
    },
    500,
  );
});

// ===== General Endpoints =====

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    message: "x402-exec Showcase Server",
    defaultNetwork: appConfig.defaultNetwork,
    supportedNetworks: getSupportedNetworks(),
  });
});

app.get("/api/scenarios", (c) => {
  return c.json({
    scenarios: ["premium-download"],
    note: "Other scenarios have moved to Serverless Mode (client-side implementation)",
  });
});

// ===== Premium Content Download (Server Mode) =====

app.get("/api/premium-download/info", (c) => {
  const info = premiumDownload.getScenarioInfo();
  return c.json(info);
});

app.post(
  "/api/purchase-download",
  async (c, next) => {
    // Debug: log X-PAYMENT header
    const xPayment = c.req.header("X-PAYMENT");
    console.log("[Debug] X-PAYMENT header:", xPayment ? "PRESENT" : "NOT FOUND");
    if (xPayment) {
      console.log("[Debug] X-PAYMENT length:", xPayment.length);
    }
    await next();
  },
  paymentMiddleware(
    appConfig.resourceServerAddress,
    {
      price: "$1", // $1 USD → converts to ~154 JPYC or 1 USDFC based on token rate
      network: getSupportedNetworks() as any,
      // Dynamic fee calculation with cap at 3% of payment
      // This ensures fees are reasonable relative to payment amount
      maxFeePercentage: 0.03, // Fee capped at 3% of payment
      config: {
        description: "Premium Content Download: Purchase and download digital content",
      },
    },
    facilitatorConfig,
  ),
  async (c) => {
    const x402 = c.get("x402");
    const body = await c.req.json();

    console.log("[Premium Download] Payment completed successfully");
    console.log(`[Premium Download] Network: ${x402.network}`);
    console.log(`[Premium Download] Payer: ${x402.payer}`);

    // Verify content exists
    const contentId = body.contentId || "x402-protocol-guide";
    const content = premiumDownload.getContentItem(contentId);

    if (!content) {
      return c.json(
        {
          success: false,
          error: `Content not found: ${contentId}`,
        },
        404,
      );
    }

    // Generate download access
    const downloadAccess = premiumDownload.generateDownloadUrl(
      contentId,
      x402.payer as `0x${string}`,
    );

    console.log(`[Premium Download] Generated download URL for ${x402.payer}`);
    console.log(`[Premium Download] Content: ${content.title}`);
    console.log(`[Premium Download] Expires: ${downloadAccess.expiresAt}`);

    return c.json({
      success: true,
      message: "Purchase successful",
      downloadUrl: downloadAccess.downloadUrl,
      fileName: downloadAccess.fileName,
      expiresAt: downloadAccess.expiresAt,
      network: x402.network,
    });
  },
);

// Serve download files
app.get("/api/download/:contentId", async (c) => {
  const contentId = c.req.param("contentId");
  const token = c.req.query("token");

  if (!token) {
    return c.json({ error: "Download token required" }, 401);
  }

  // Verify token
  const isValid = premiumDownload.verifyDownloadToken(contentId, token);
  if (!isValid) {
    return c.json({ error: "Invalid or expired download token" }, 403);
  }

  const content = premiumDownload.getContentItem(contentId);
  if (!content) {
    return c.json({ error: "Content not found" }, 404);
  }

  console.log(`[Download] Serving ${content.fileName} to user`);

  // In production, stream file from S3/cloud storage
  // For demo, serve the static PDF file
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const { fileURLToPath } = await import("url");
    const { dirname } = await import("path");

    // Get the directory of the current file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // In production (dist/), static files are at dist/static/
    // In development (src/), static files are at ../static/
    const staticDir = __dirname.includes("/dist")
      ? join(__dirname, "static") // Production: dist/static/
      : join(__dirname, "..", "static"); // Development: server/static/

    const filePath = join(staticDir, content.fileName);

    const fileContent = await readFile(filePath);

    return c.body(fileContent, 200, {
      "Content-Type": content.mimeType,
      "Content-Disposition": `attachment; filename="${content.fileName}"`,
      "Content-Length": fileContent.length.toString(),
    });
  } catch (error) {
    console.error("[Download] Error reading file:", error);
    return c.json({ error: "File not found" }, 404);
  }
});

// Start server
const port = Number(process.env.PORT) || 3000;
console.log(`🚀 x402-exec Showcase Server (Server Mode Only) starting on port ${port}`);
console.log(`📍 Default network: ${appConfig.defaultNetwork}`);
console.log(`🌐 Supported networks: ${getSupportedNetworks().join(", ")}`);
console.log(`💰 Resource server address: ${appConfig.resourceServerAddress}`);
console.log(`🔧 Facilitator URL: ${appConfig.facilitatorUrl}`);
console.log(`📥 Server Mode: Premium Download`);

serve({
  fetch: app.fetch,
  port,
});
