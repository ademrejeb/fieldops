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
