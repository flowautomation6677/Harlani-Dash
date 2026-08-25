/**
 * niboSchemas.ts
 *
 * Schemas Zod que representam o contrato da API do Nibo (empresas/v1).
 * Sao a fonte da verdade: se a API mudar um campo, o erro aparece aqui
 * com uma mensagem clara, antes de causar R$0,00 silencioso no dashboard.
 *
 * .passthrough() => nao rejeita campos extras que o Nibo possa adicionar.
 * .optional()/.nullable() => campos que ja observamos serem null ou ausentes.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Sub-schemas reutilizaveis
// ---------------------------------------------------------------------------

export const NiboCategorySchema = z.object({
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  parent: z.string().optional(),
  value: z.number().optional(),
  percentage: z.number().optional(),
}).passthrough();

export const NiboReceiptSchema = z.object({
  netValue: z.number().optional().nullable(),
  value: z.number().optional().nullable(),
  interestValue: z.number().optional().nullable().default(0),
  fineValue: z.number().optional().nullable().default(0),
  discountValue: z.number().optional().nullable().default(0),
  receiptDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
}).passthrough();

export const NiboPaymentSchema = z.object({
  netValue: z.number().optional().nullable(),
  value: z.number().optional().nullable(),
  interestValue: z.number().optional().nullable().default(0),
  fineValue: z.number().optional().nullable().default(0),
  discountValue: z.number().optional().nullable().default(0),
  paymentDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
}).passthrough();

export const NiboStakeholderSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
}).passthrough();

// ---------------------------------------------------------------------------
// Schemas principais de agendamento
// ---------------------------------------------------------------------------

export const NiboCreditScheduleSchema = z.object({
  scheduleId: z.string().optional(),
  id: z.string().optional(),
  description: z.string().optional().nullable(),
  value: z.number('"value" ausente ou invalido em schedules/credit — verifique se a API mudou o nome do campo'),
  dueDate: z.string('"dueDate" ausente em schedules/credit'),
  isPaid: z.boolean().optional().default(false),
  paidDate: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  categories: z.array(NiboCategorySchema).optional().default([]),
  receipts: z.array(NiboReceiptSchema).optional().default([]),
  stakeholder: NiboStakeholderSchema.optional().nullable(),
}).passthrough();

export const NiboDebitScheduleSchema = z.object({
  scheduleId: z.string().optional(),
  id: z.string().optional(),
  description: z.string().optional().nullable(),
  value: z.number('"value" ausente ou invalido em schedules/debit — verifique se a API mudou o nome do campo'),
  dueDate: z.string('"dueDate" ausente em schedules/debit'),
  isPaid: z.boolean().optional().default(false),
  paidDate: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  categories: z.array(NiboCategorySchema).optional().default([]),
  payments: z.array(NiboPaymentSchema).optional().default([]),
  stakeholder: NiboStakeholderSchema.optional().nullable(),
}).passthrough();

// ---------------------------------------------------------------------------
// Schema de Conta Bancaria
// ---------------------------------------------------------------------------

export const NiboBankAccountSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().optional(),
  name: z.string('"name" ausente em accounts — verifique o contrato da API'),
  bankName: z.string().optional().nullable(),
  openBalance: z.number().optional().nullable().default(0),
  type: z.string().optional().nullable(),
  bankAgency: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  isVirtual: z.boolean().optional().default(false),
  isAutomated: z.boolean().optional().default(false),
}).passthrough();

// ---------------------------------------------------------------------------
// Tipos inferidos (TypeScript sem duplicar interfaces)
// ---------------------------------------------------------------------------

export type NiboCreditSchedule = z.infer<typeof NiboCreditScheduleSchema>;
export type NiboDebitSchedule = z.infer<typeof NiboDebitScheduleSchema>;
export type NiboBankAccount = z.infer<typeof NiboBankAccountSchema>;
export type NiboReceipt = z.infer<typeof NiboReceiptSchema>;
export type NiboPayment = z.infer<typeof NiboPaymentSchema>;
