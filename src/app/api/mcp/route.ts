import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

// ── Config ──────────────────────────────────────────────────────────
const API_BASE_URL = process.env.API_BASE_URL || "https://aluri.co/api";
const ALURI_API_KEY = process.env.ALURI_API_KEY || "";
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── API helper ──────────────────────────────────────────────────────
async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ALURI_API_KEY) headers["X-API-Key"] = ALURI_API_KEY;

  const options: RequestInit = { method, headers };
  if (body && method === "POST") options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }
  return response.json();
}

// ── MCP Server factory ──────────────────────────────────────────────
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcp-aluri-server",
    version: "2.1.0",
  });

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
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_credito_detalle",
    "Obtiene todos los detalles de un crédito específico.",
    { credito_id: z.string() },
    async ({ credito_id }) => {
      const result = await apiRequest(`/creditos/${encodeURIComponent(credito_id)}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_pagos",
    "Obtiene el historial de pagos de un crédito específico.",
    { credito_id: z.string() },
    async ({ credito_id }) => {
      const result = await apiRequest(`/pagos?credito_id=${encodeURIComponent(credito_id)}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "registrar_pago",
    "Registra un nuevo pago del propietario. Calcula automáticamente la distribución a inversionistas.",
    { credito_id: z.string(), fecha_pago: z.string(), monto: z.number() },
    async ({ credito_id, fecha_pago, monto }) => {
      const result = await apiRequest("/pagos", "POST", { credito_id, fecha_pago, monto });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_distribucion",
    "Obtiene resumen de distribución de pagos a inversionistas para un crédito.",
    { credito_id: z.string() },
    async ({ credito_id }) => {
      const result = await apiRequest(`/pagos/distribucion?credito_id=${encodeURIComponent(credito_id)}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

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
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

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
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_pagos_inversionista",
    "Obtiene todos los pagos recibidos por un inversionista específico.",
    { inversionista_id: z.string() },
    async ({ inversionista_id }) => {
      const result = await apiRequest(`/inversionistas/${inversionista_id}/pagos`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

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
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_esquema_tabla",
    "Obtiene las columnas y tipos de una tabla de la base de datos.",
    { tabla: z.string() },
    async ({ tabla }) => {
      const result = await apiRequest(`/esquema?tabla=${encodeURIComponent(tabla)}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "obtener_causaciones",
    "Obtiene la tabla de causación diaria de intereses para un crédito específico.",
    { credito_id: z.string(), limite: z.number().optional() },
    async ({ credito_id, limite }) => {
      const lim = limite || 100;
      const result = await apiRequest(`/causaciones?credito_id=${encodeURIComponent(credito_id)}&limite=${lim}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

// ── Auth check ──────────────────────────────────────────────────────
function checkAuth(request: NextRequest): boolean {
  if (!MCP_AUTH_TOKEN) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${MCP_AUTH_TOKEN}`;
}

// ── Handle any MCP request (stateless) ──────────────────────────────
async function handleMcpRequest(request: NextRequest): Promise<Response> {
  if (!checkAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mcpServer = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  await mcpServer.connect(transport);

  try {
    const response = await transport.handleRequest(request);
    return response;
  } finally {
    await transport.close();
    await mcpServer.close();
  }
}

// ── Next.js route handlers ──────────────────────────────────────────
export async function POST(request: NextRequest): Promise<Response> {
  return handleMcpRequest(request);
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return handleMcpRequest(request);
}
