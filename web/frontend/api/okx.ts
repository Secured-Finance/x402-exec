// api/okx.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac } from "crypto";

// OKX DEX/Wallet API proxy
// Usage:
//   - GET/POST/etc /api/okx?path=/api/v6/dex/xxxxx&foo=bar
//   - The function signs the request and forwards it to `${OKX_BASE_URL}${path}`
//   - All query params other than `path` are appended to the target path
//   - Response status, headers (safe subset), and body are proxied back unchanged

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const method = (req.method || "GET").toUpperCase();

		// Default to official Web3 host (no path). Provide full request path in `path`, e.g., /api/v6/...
		const baseUrl = process.env.OKX_BASE_URL || "https://web3.okx.com";
    const apiKey = process.env.OKX_ACCESS_KEY;
		const secretKey = process.env.OKX_SECRET_KEY;
		const passphrase = process.env.OKX_PASSPHRASE;

		if (!apiKey || !secretKey || !passphrase) {
      res.status(500).json({
        error: "Missing OKX credentials",
        missing: {
          OKX_ACCESS_KEY: !apiKey,
          OKX_SECRET_KEY: !secretKey,
          OKX_PASSPHRASE: !passphrase,
        },
      });
			return;
		}

		// Extract and validate target path
		const rawPath = (req.query?.path ?? "") as string;
		if (!rawPath || typeof rawPath !== "string") {
			res.status(400).json({ error: "Query param 'path' is required" });
			return;
		}
		if (/^https?:\/\//i.test(rawPath) || rawPath.startsWith("//")) {
			res
				.status(400)
				.json({ error: "'path' must be a URL path, not a full URL" });
			return;
		}

		// Build final request path including combined query string
		const ensureLeadingSlash = rawPath.startsWith("/")
			? rawPath
			: `/${rawPath}`;
		const [pathOnly, pathQuery = ""] = ensureLeadingSlash.split("?", 2);

		const incomingQuery = new URLSearchParams();
		for (const [k, v] of Object.entries(req.query || {})) {
			if (k === "path") continue;
			if (Array.isArray(v)) {
				for (const vv of v) incomingQuery.append(k, String(vv));
			} else if (v != null) {
				incomingQuery.append(k, String(v));
			}
		}

		const merged = new URLSearchParams(pathQuery);
		// Append incoming query (may create duplicates intentionally)
		for (const [k, v] of incomingQuery.entries()) merged.append(k, v);

		const requestPathUrl = merged.toString()
			? `${pathOnly}?${merged.toString()}`
			: pathOnly;


		// Determine the actual request path used for signing (must match what server sees)
		// If base includes a path prefix like /api/v6, include it in the prehash path.
		const baseParsed = new URL(baseUrl);
		const basePathPrefix = baseParsed.pathname.replace(/\/$/, ""); // "" or "/api/v6"
		// Signing rules per official snippet:
		// - GET/HEAD: include query string in request_path
		// - POST (and others): use path only (no query) + JSON body
		const requestPathForSignRelative =
			method === "GET" || method === "HEAD" ? requestPathUrl : pathOnly;
		const requestPathForSign = `${basePathPrefix}${requestPathForSignRelative}` || "/";

		// Prepare body for signing and forwarding
		let bodyString = "";
		if (method !== "GET" && method !== "HEAD") {
			const b: any = (req as any).body;
			if (typeof b === "string") bodyString = b;
			else if (b == null) bodyString = "";
			else bodyString = JSON.stringify(b);
		}

		// Use seconds precision to match official snippet (YYYY-MM-DDTHH:mm:ssZ)
		const timestamp = new Date().toISOString().slice(0, -5) + "Z";
		const prehash = timestamp + method + requestPathForSign + bodyString;
		const sign = createHmac("sha256", secretKey)
			.update(prehash)
			.digest("base64");

		// Compose headers
		const headers: Record<string, string> = {
			"OK-ACCESS-KEY": apiKey,
			"OK-ACCESS-TIMESTAMP": timestamp,
			"OK-ACCESS-PASSPHRASE": passphrase,
			"OK-ACCESS-SIGN": sign,
		};
		// Preserve content-type and accept if provided
		const contentType = req.headers["content-type"];
		if (typeof contentType === "string") headers["Content-Type"] = contentType;
		else if (method !== "GET" && method !== "HEAD") headers["Content-Type"] = "application/json";
		const accept = req.headers["accept"];
		if (typeof accept === "string") headers["Accept"] = accept;

		// Execute request to OKX
		const targetUrl = baseUrl.replace(/\/?$/, "") + requestPathUrl; // ensure no trailing slash duplication
		const okxRes = await fetch(targetUrl, {
			method,
			headers,
			body: method === "GET" || method === "HEAD" ? undefined : bodyString,
		});

		// Copy safe subset of headers
		const hopByHop = new Set([
			"connection",
			"keep-alive",
			"proxy-authenticate",
			"proxy-authorization",
			"te",
			"trailers",
			"transfer-encoding",
			"upgrade",
			"content-encoding",
			"content-length",
		]);
		okxRes.headers.forEach((value, key) => {
			if (!hopByHop.has(key.toLowerCase())) {
				try {
					res.setHeader(key, value);
				} catch {
					// ignore invalid header names/values
				}
			}
		});

		// Stream back body as text (do not parse to keep exact payload)
		const text = await okxRes.text();
		res.status(okxRes.status).send(text);
	} catch (err: any) {
		console.error("/api/okx proxy error:", err);
		res.status(500).json({ error: err?.message ?? "internal error" });
	}
}
