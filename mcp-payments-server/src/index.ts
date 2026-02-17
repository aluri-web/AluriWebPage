#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Configuración de la API base
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

// Función helper para hacer requests a la API
async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
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
  {
    name: "list_loans",
    description: "Lista todos los préstamos disponibles en el sistema. Útil para obtener los códigos de préstamo válidos antes de registrar pagos.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
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
];

// Crear el servidor MCP
const server = new Server(
  {
    name: "mcp-payments-server",
    version: "1.0.0",
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
      case "list_loans": {
        const result = await apiRequest("/loans");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_payments": {
        const { loan_id } = args as { loan_id: string };
        const result = await apiRequest(`/payments?loan_id=${encodeURIComponent(loan_id)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
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
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_distribution": {
        const { loan_id } = args as { loan_id: string };
        const result = await apiRequest(`/payments/distribution?loan_id=${encodeURIComponent(loan_id)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Iniciar el servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Payments Server iniciado");
}

main().catch(console.error);
