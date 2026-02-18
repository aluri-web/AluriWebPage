#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Configuración de la API base
const API_BASE_URL = process.env.API_BASE_URL || "https://aluri.co/api";
const AUTH_TOKEN = process.env.ALURI_AUTH_TOKEN || "";

// Función helper para hacer requests a la API
async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
  requiresAuth: boolean = false
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth && AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

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

// Definición de las herramientas disponibles
const tools: Tool[] = [
  // ========== PRÉSTAMOS ==========
  {
    name: "list_loans",
    description: "Lista todos los préstamos/créditos disponibles en el sistema. Muestra código, monto, estado y cliente.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        estado: {
          type: "string",
          description: "Filtrar por estado: solicitado, aprobado, publicado, en_firma, firmado, activo, finalizado, castigado, mora, anulado",
        },
      },
      required: [],
    },
  },

  // ========== PAGOS ==========
  {
    name: "get_payments",
    description: "Obtiene el historial de pagos de un préstamo específico, incluyendo la distribución calculada para cada inversionista.",
    inputSchema: {
      type: "object",
      properties: {
        loan_id: {
          type: "string",
          description: "ID o código del préstamo (ej: CR-001 o UUID)",
        },
      },
      required: ["loan_id"],
    },
  },
  {
    name: "register_payment",
    description: "Registra un nuevo pago del propietario. Calcula automáticamente la distribución a los inversionistas según su porcentaje de participación.",
    inputSchema: {
      type: "object",
      properties: {
        loan_id: {
          type: "string",
          description: "ID o código del préstamo",
        },
        payment_date: {
          type: "string",
          description: "Fecha del pago en formato YYYY-MM-DD",
        },
        amount_capital: {
          type: "number",
          description: "Monto abonado a capital (reduce la deuda principal)",
        },
        amount_interest: {
          type: "number",
          description: "Monto de intereses pagados (ganancia para inversionistas)",
        },
        amount_late_fee: {
          type: "number",
          description: "Monto de mora u otros cargos (opcional, default: 0)",
        },
      },
      required: ["loan_id", "payment_date", "amount_capital", "amount_interest"],
    },
  },
  {
    name: "get_distribution",
    description: "Obtiene un resumen completo de la distribución de pagos a inversionistas para un préstamo, incluyendo cuánto ha ganado cada inversionista y su ROI.",
    inputSchema: {
      type: "object",
      properties: {
        loan_id: {
          type: "string",
          description: "ID o código del préstamo",
        },
      },
      required: ["loan_id"],
    },
  },

  // ========== PROPIETARIOS (Admin) ==========
  {
    name: "list_propietarios",
    description: "Lista todos los propietarios (deudores) del sistema. REQUIERE autenticación admin. Incluye información de créditos activos y deuda total.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        search: {
          type: "string",
          description: "Buscar por nombre, documento o email",
        },
      },
      required: [],
    },
  },

  // ========== INVERSIONISTAS (Admin) ==========
  {
    name: "list_inversionistas",
    description: "Lista todos los inversionistas del sistema. REQUIERE autenticación admin. Incluye información de inversiones activas y total invertido.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        search: {
          type: "string",
          description: "Buscar por nombre, documento o email",
        },
      },
      required: [],
    },
  },
  {
    name: "get_investor_payments",
    description: "Obtiene todos los pagos recibidos por un inversionista específico, incluyendo el detalle de cada préstamo donde tiene inversión.",
    inputSchema: {
      type: "object",
      properties: {
        investor_id: {
          type: "string",
          description: "UUID del inversionista",
        },
      },
      required: ["investor_id"],
    },
  },

  // ========== USUARIOS (Admin) ==========
  {
    name: "list_users",
    description: "Lista todos los usuarios del sistema. Puede filtrar por rol.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        role: {
          type: "string",
          description: "Filtrar por rol: admin, inversionista, propietario",
        },
      },
      required: [],
    },
  },

  // ========== SCHEMA ==========
  {
    name: "get_table_schema",
    description: "Obtiene las columnas y tipos de una tabla de la base de datos. Útil para entender la estructura de datos.",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Nombre de la tabla: creditos, profiles, inversiones, transacciones, plan_pagos",
        },
      },
      required: ["table"],
    },
  },
];

// Crear el servidor MCP
const server = new Server(
  {
    name: "mcp-aluri-server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar herramientas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handler para ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ========== PRÉSTAMOS ==========
      case "list_loans": {
        const { limit, estado } = (args || {}) as { limit?: number; estado?: string };
        let endpoint = "/loans";
        const params: string[] = [];
        if (limit) params.push(`limit=${limit}`);
        if (estado) params.push(`estado=${estado}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== PAGOS ==========
      case "get_payments": {
        const { loan_id } = args as { loan_id: string };
        const result = await apiRequest(`/payments?loan_id=${encodeURIComponent(loan_id)}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "register_payment": {
        const { loan_id, payment_date, amount_capital, amount_interest, amount_late_fee } = args as {
          loan_id: string;
          payment_date: string;
          amount_capital: number;
          amount_interest: number;
          amount_late_fee?: number;
        };

        const result = await apiRequest("/payments", "POST", {
          loan_id,
          payment_date,
          amount_capital,
          amount_interest,
          amount_late_fee: amount_late_fee || 0,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_distribution": {
        const { loan_id } = args as { loan_id: string };
        const result = await apiRequest(`/payments/distribution?loan_id=${encodeURIComponent(loan_id)}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== PROPIETARIOS (Admin) ==========
      case "list_propietarios": {
        const { limit, search } = (args || {}) as { limit?: number; search?: string };
        let endpoint = "/propietarios";
        const params: string[] = [];
        if (limit) params.push(`limit=${limit}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== INVERSIONISTAS (Admin) ==========
      case "list_inversionistas": {
        const { limit, search } = (args || {}) as { limit?: number; search?: string };
        let endpoint = "/inversionistas";
        const params: string[] = [];
        if (limit) params.push(`limit=${limit}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_investor_payments": {
        const { investor_id } = args as { investor_id: string };
        const result = await apiRequest(`/investors/${investor_id}/payments`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== USUARIOS ==========
      case "list_users": {
        const { limit, role } = (args || {}) as { limit?: number; role?: string };
        let endpoint = "/users";
        const params: string[] = [];
        if (limit) params.push(`limit=${limit}`);
        if (role) params.push(`role=${role}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== SCHEMA ==========
      case "get_table_schema": {
        const { table } = args as { table: string };
        const result = await apiRequest(`/schema?table=${encodeURIComponent(table)}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Iniciar el servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Aluri Server v2.0 iniciado");
  console.error(`API Base URL: ${API_BASE_URL}`);
  console.error(`Auth Token: ${AUTH_TOKEN ? "Configurado" : "No configurado"}`);
}

main().catch(console.error);
