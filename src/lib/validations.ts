import { z } from "zod";

export const ticketCreateSchema = z.object({
  customerId: z.string().min(1),
  assetId: z.string().optional().nullable(),
  title: z.string().min(4).max(140),
  description: z.string().max(2000).default(""),
  priority: z.enum(["P1_CRITICAL", "P2_HIGH", "P3_NORMAL", "P4_LOW"]).default("P3_NORMAL"),
  channel: z.enum(["PHONE", "EMAIL", "PORTAL", "IOT", "WHATSAPP"]).default("PHONE"),
  errorCode: z.string().max(40).default(""),
});

export const statusChangeSchema = z.object({
  status: z.enum([
    "NEW",
    "QUALIFIED",
    "SCHEDULED",
    "EN_ROUTE",
    "ON_SITE",
    "IN_PROGRESS",
    "RESOLVED",
    "INVOICED",
    "CLOSED",
    "CANCELLED",
  ]),
  actor: z.string().default("dispatcher"),
  note: z.string().max(1000).default(""),
});

export const workOrderCreateSchema = z.object({
  ticketId: z.string().min(1),
  jobType: z.string().default("REPAIR"),
  scheduledStart: z.string().optional(),
  estimatedMin: z.coerce.number().min(15).max(1440).default(90),
  technicianIds: z.array(z.string()).default([]),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;

const PRIORITY = z.enum(["P1_CRITICAL", "P2_HIGH", "P3_NORMAL", "P4_LOW"]);

/** Public, no-account intake. Honeypot + elapsed time are checked server-side. */
export const publicRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().max(80).default(""),
  assetCategory: z.enum(["ELEVATOR", "HVAC", "SECURITY", "OTHER"]).default("OTHER"),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(2000),
  priority: PRIORITY.default("P3_NORMAL"),
  errorCode: z.string().trim().max(40).default(""),
  consent: z.literal(true),
  website: z.string().max(0).default(""),
  startedAt: z.coerce.number().optional(),
});

/** Dispatcher decision on the stored agent review. */
export const reviewActionSchema = z.object({
  action: z.enum(["accept", "refuse"]),
  technicianId: z.string().min(1).optional().nullable(),
  priority: PRIORITY.optional().nullable(),
  invoiceLines: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        qty: z.coerce.number().int().min(1).max(20),
        unitPrice: z.coerce.number().int().min(1).max(10_000_000),
      }),
    )
    .max(20)
    .optional(),
  reason: z.string().trim().max(500).default(""),
});
