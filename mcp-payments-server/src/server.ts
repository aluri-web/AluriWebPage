#!/usr/bin/env node

/**
 * Remote MCP Server for Aluri — Streamable HTTP transport.
 * Deploy this as a web service and use the URL as a Claude.ai connector.
 *
 * Env vars:
 *   API_BASE_URL    — Aluri API base (default: https://aluri.co/api)
 *   ALURI_API_KEY   — API key for Aluri backend
 *   MCP_AUTH_TOKEN  — Bearer token clients must send to access this MCP server
 *   PORT            — HTTP port (default: 3100)
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// ── Config ──────────────────────────────────────────────────────────
const API_BASE_URL = process.env.API_BASE_URL || "https://aluri.co/api";
const TITULOS_API_URL = process.env.TITULOS_API_URL || "https://aluri-agent-titulos.onrender.com";
const API_KEY = process.env.ALURI_API_KEY || "";
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || "";
const PORT = parseInt(process.env.PORT || "3100", 10);

// ── API helper ──────────────────────────────────────────────────────
async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }

  const options: RequestInit = { method, headers };
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }
  return response.json();
}

// ── Títulos API helper ──────────────────────────────────────────────
async function titulosRequest(
  endpoint: string,
): Promise<unknown> {
  const url = `${TITULOS_API_URL}${endpoint}`;
  const response = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Títulos API Error (${response.status}): ${error}`);
  }
  return response.json();
}

// ── MCP Server factory ──────────────────────────────────────────────
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcp-aluri-server",
    version: "2.1.0",
  });

  // ── Créditos ──
  server.tool(
    "listar_creditos",
    "Lista todos los créditos/préstamos disponibles en el sistema.",
    { limite: z.number().optional(), estado: z.string().optional() },
    async ({ limite, estado }) => {
      let endpoint = "/creditos";
      const params: string[] = [];
      if (limite) params.push(`limite=${limite}`);
      if (estado) params.push(`estado=${estado}`);
      if (params.length) endpoint += `?${params.join("&")}`;
      const result = await apiRequest(endpoint);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_credito_detalle",
    "Obtiene todos los detalles de un crédito específico.",
    { credito_id: z.string() },
    async ({ credito_id }) => {
      const result = await apiRequest(`/creditos/${encodeURIComponent(credito_id)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Pagos ──
  server.tool(
    "obtener_pagos",
    "Obtiene el historial de pagos de un crédito específico.",
    { credito_id: z.string() },
    async ({ credito_id }) => {
      const result = await apiRequest(`/pagos?credito_id=${encodeURIComponent(credito_id)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "registrar_pago",
    "Registra un nuevo pago del propietario. Calcula automáticamente la distribución a inversionistas.",
    { credito_id: z.string(), fecha_pago: z.string(), monto: z.number() },
    async ({ credito_id, fecha_pago, monto }) => {
      const result = await apiRequest("/pagos", "POST", { credito_id, fecha_pago, monto });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_distribucion",
    "Obtiene resumen de distribución de pagos a inversionistas para un crédito.",
    { credito_id: z.string() },
    async ({ credito_id }) => {
      const result = await apiRequest(`/pagos/distribucion?credito_id=${encodeURIComponent(credito_id)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Propietarios ──
  server.tool(
    "listar_propietarios",
    "Lista todos los propietarios (deudores) del sistema.",
    { limite: z.number().optional(), buscar: z.string().optional() },
    async ({ limite, buscar }) => {
      let endpoint = "/propietarios";
      const params: string[] = [];
      if (limite) params.push(`limit=${limite}`);
      if (buscar) params.push(`search=${encodeURIComponent(buscar)}`);
      if (params.length) endpoint += `?${params.join("&")}`;
      const result = await apiRequest(endpoint);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Inversionistas ──
  server.tool(
    "listar_inversionistas",
    "Lista todos los inversionistas del sistema.",
    { limite: z.number().optional(), buscar: z.string().optional() },
    async ({ limite, buscar }) => {
      let endpoint = "/inversionistas";
      const params: string[] = [];
      if (limite) params.push(`limit=${limite}`);
      if (buscar) params.push(`search=${encodeURIComponent(buscar)}`);
      if (params.length) endpoint += `?${params.join("&")}`;
      const result = await apiRequest(endpoint);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_pagos_inversionista",
    "Obtiene todos los pagos recibidos por un inversionista específico.",
    { inversionista_id: z.string() },
    async ({ inversionista_id }) => {
      const result = await apiRequest(`/inversionistas/${inversionista_id}/pagos`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Usuarios ──
  server.tool(
    "listar_usuarios",
    "Lista todos los usuarios del sistema. Puede filtrar por rol.",
    { limite: z.number().optional(), rol: z.string().optional() },
    async ({ limite, rol }) => {
      let endpoint = "/usuarios";
      const params: string[] = [];
      if (limite) params.push(`limite=${limite}`);
      if (rol) params.push(`rol=${rol}`);
      if (params.length) endpoint += `?${params.join("&")}`;
      const result = await apiRequest(endpoint);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Esquema ──
  server.tool(
    "obtener_esquema_tabla",
    "Obtiene las columnas y tipos de una tabla de la base de datos.",
    { tabla: z.string() },
    async ({ tabla }) => {
      const result = await apiRequest(`/esquema?tabla=${encodeURIComponent(tabla)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Causaciones ──
  server.tool(
    "obtener_causaciones",
    "Obtiene la tabla de causación diaria de intereses para un crédito específico.",
    { credito_id: z.string(), limite: z.number().optional() },
    async ({ credito_id, limite }) => {
      const lim = limite || 100;
      const result = await apiRequest(`/causaciones?credito_id=${encodeURIComponent(credito_id)}&limite=${lim}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Análisis de crédito (debugging) ──
  server.tool(
    "obtener_analisis_credito",
    "Consulta filas de credito_analyses para debugging. Busca por nombre, cédula, ID de análisis o lead_id. Devuelve los campos JSONB completos (extracted_data, bank_analysis, recommendations, etc.).",
    {
      search: z.string().optional(),
      id: z.string().optional(),
      lead_id: z.string().optional(),
      only_latest: z.boolean().optional(),
      limit: z.number().optional(),
    },
    async ({ search, id, lead_id, only_latest, limit }) => {
      const params: string[] = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (id) params.push(`id=${encodeURIComponent(id)}`);
      if (lead_id) params.push(`lead_id=${encodeURIComponent(lead_id)}`);
      if (only_latest) params.push(`only_latest=true`);
      if (limit) params.push(`limit=${limit}`);
      const endpoint = `/analisis/credito${params.length ? `?${params.join("&")}` : ""}`;
      const result = await apiRequest(endpoint);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Estudio de Títulos ──
  server.tool(
    "listar_estudios_titulos",
    "Lista los estudios de títulos realizados. Puede filtrar por cédula del solicitante.",
    { solicitor_document: z.string().optional(), limite: z.number().optional() },
    async ({ solicitor_document, limite }) => {
      let endpoint = "/api/v1/studies";
      const params: string[] = [];
      if (solicitor_document) params.push(`solicitor_document=${encodeURIComponent(solicitor_document)}`);
      if (limite) params.push(`limit=${limite}`);
      if (params.length) endpoint += `?${params.join("&")}`;
      const result = await titulosRequest(endpoint);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_estudio_titulos",
    "Obtiene el detalle completo de un estudio de títulos, incluyendo reporte, nivel de riesgo, banderas rojas y datos del inmueble.",
    { study_id: z.string() },
    async ({ study_id }) => {
      const result = await titulosRequest(`/api/v1/studies/${encodeURIComponent(study_id)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

// ── Express app ─────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Auth middleware — validate bearer token if MCP_AUTH_TOKEN is set
if (MCP_AUTH_TOKEN) {
  app.use("/mcp", (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${MCP_AUTH_TOKEN}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });
}

// Map of session ID → transport (for stateful mode)
const transports = new Map<string, StreamableHTTPServerTransport>();

// POST /mcp — handle JSON-RPC messages
app.post("/mcp", async (req, res) => {
  try {
    // Check for existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Existing session — route to its transport
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // New session — create server + transport
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };

    await mcpServer.connect(transport);

    // Store transport by session ID after handling (session ID is set during init)
    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }
  } catch (err) {
    console.error("MCP error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// GET /mcp — SSE stream for server-initiated messages
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// DELETE /mcp — close session
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.close();
  transports.delete(sessionId);
  res.status(200).json({ ok: true });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", sessions: transports.size });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP Aluri Remote Server v2.1 listening on port ${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`Auth: ${MCP_AUTH_TOKEN ? "enabled" : "disabled (set MCP_AUTH_TOKEN to secure)"}`);
});
