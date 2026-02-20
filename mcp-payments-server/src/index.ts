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
  // ========== CRÉDITOS ==========
  {
    name: "listar_creditos",
    description: "Lista todos los créditos/préstamos disponibles en el sistema. Muestra código, monto, estado y cliente.",
    inputSchema: {
      type: "object",
      properties: {
        limite: {
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
    name: "obtener_pagos",
    description: "Obtiene el historial de pagos de un crédito específico, incluyendo la distribución calculada para cada inversionista.",
    inputSchema: {
      type: "object",
      properties: {
        credito_id: {
          type: "string",
          description: "ID o código del crédito (ej: CR-001 o UUID)",
        },
      },
      required: ["credito_id"],
    },
  },
  {
    name: "registrar_pago",
    description: "Registra un nuevo pago del propietario. Calcula automáticamente la distribución a los inversionistas según su porcentaje de participación.",
    inputSchema: {
      type: "object",
      properties: {
        credito_id: {
          type: "string",
          description: "ID o código del crédito",
        },
        fecha_pago: {
          type: "string",
          description: "Fecha del pago en formato YYYY-MM-DD",
        },
        monto_capital: {
          type: "number",
          description: "Monto abonado a capital (reduce la deuda principal)",
        },
        monto_interes: {
          type: "number",
          description: "Monto de intereses pagados (ganancia para inversionistas)",
        },
        monto_mora: {
          type: "number",
          description: "Monto de mora u otros cargos (opcional, default: 0)",
        },
      },
      required: ["credito_id", "fecha_pago", "monto_capital", "monto_interes"],
    },
  },
  {
    name: "obtener_distribucion",
    description: "Obtiene un resumen completo de la distribución de pagos a inversionistas para un crédito, incluyendo cuánto ha ganado cada inversionista y su ROI.",
    inputSchema: {
      type: "object",
      properties: {
        credito_id: {
          type: "string",
          description: "ID o código del crédito",
        },
      },
      required: ["credito_id"],
    },
  },

  // ========== PROPIETARIOS (Admin) ==========
  {
    name: "listar_propietarios",
    description: "Lista todos los propietarios (deudores) del sistema. REQUIERE autenticación admin. Incluye información de créditos activos y deuda total.",
    inputSchema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        buscar: {
          type: "string",
          description: "Buscar por nombre, documento o email",
        },
      },
      required: [],
    },
  },

  // ========== INVERSIONISTAS (Admin) ==========
  {
    name: "listar_inversionistas",
    description: "Lista todos los inversionistas del sistema. REQUIERE autenticación admin. Incluye información de inversiones activas y total invertido.",
    inputSchema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        buscar: {
          type: "string",
          description: "Buscar por nombre, documento o email",
        },
      },
      required: [],
    },
  },
  {
    name: "obtener_pagos_inversionista",
    description: "Obtiene todos los pagos recibidos por un inversionista específico, incluyendo el detalle de cada crédito donde tiene inversión.",
    inputSchema: {
      type: "object",
      properties: {
        inversionista_id: {
          type: "string",
          description: "UUID del inversionista",
        },
      },
      required: ["inversionista_id"],
    },
  },

  // ========== USUARIOS (Admin) ==========
  {
    name: "listar_usuarios",
    description: "Lista todos los usuarios del sistema. Puede filtrar por rol.",
    inputSchema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Número máximo de resultados (default: 50)",
        },
        rol: {
          type: "string",
          description: "Filtrar por rol: admin, inversionista, propietario",
        },
      },
      required: [],
    },
  },

  // ========== ESQUEMA ==========
  {
    name: "obtener_esquema_tabla",
    description: "Obtiene las columnas y tipos de una tabla de la base de datos. Útil para entender la estructura de datos.",
    inputSchema: {
      type: "object",
      properties: {
        tabla: {
          type: "string",
          description: "Nombre de la tabla: creditos, profiles, inversiones, transacciones, plan_pagos",
        },
      },
      required: ["tabla"],
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
      // ========== CRÉDITOS ==========
      case "listar_creditos": {
        const { limite, estado } = (args || {}) as { limite?: number; estado?: string };
        let endpoint = "/creditos";
        const params: string[] = [];
        if (limite) params.push(`limite=${limite}`);
        if (estado) params.push(`estado=${estado}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== PAGOS ==========
      case "obtener_pagos": {
        const { credito_id } = args as { credito_id: string };
        const result = await apiRequest(`/pagos?credito_id=${encodeURIComponent(credito_id)}`, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "registrar_pago": {
        const { credito_id, fecha_pago, monto_capital, monto_interes, monto_mora } = args as {
          credito_id: string;
          fecha_pago: string;
          monto_capital: number;
          monto_interes: number;
          monto_mora?: number;
        };

        const result = await apiRequest("/pagos", "POST", {
          credito_id,
          fecha_pago,
          monto_capital,
          monto_interes,
          monto_mora: monto_mora || 0,
        }, true);

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obtener_distribucion": {
        const { credito_id } = args as { credito_id: string };
        const result = await apiRequest(`/pagos/distribucion?credito_id=${encodeURIComponent(credito_id)}`, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== PROPIETARIOS (Admin) ==========
      case "listar_propietarios": {
        const { limite, buscar } = (args || {}) as { limite?: number; buscar?: string };
        let endpoint = "/propietarios";
        const params: string[] = [];
        if (limite) params.push(`limit=${limite}`);
        if (buscar) params.push(`search=${encodeURIComponent(buscar)}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== INVERSIONISTAS (Admin) ==========
      case "listar_inversionistas": {
        const { limite, buscar } = (args || {}) as { limite?: number; buscar?: string };
        let endpoint = "/inversionistas";
        const params: string[] = [];
        if (limite) params.push(`limit=${limite}`);
        if (buscar) params.push(`search=${encodeURIComponent(buscar)}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obtener_pagos_inversionista": {
        const { inversionista_id } = args as { inversionista_id: string };
        const result = await apiRequest(`/inversionistas/${inversionista_id}/pagos`, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== USUARIOS ==========
      case "listar_usuarios": {
        const { limite, rol } = (args || {}) as { limite?: number; rol?: string };
        let endpoint = "/usuarios";
        const params: string[] = [];
        if (limite) params.push(`limite=${limite}`);
        if (rol) params.push(`rol=${rol}`);
        if (params.length > 0) endpoint += `?${params.join("&")}`;

        const result = await apiRequest(endpoint, "GET", undefined, true);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ========== ESQUEMA ==========
      case "obtener_esquema_tabla": {
        const { tabla } = args as { tabla: string };
        const result = await apiRequest(`/esquema?tabla=${encodeURIComponent(tabla)}`, "GET", undefined, true);
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
