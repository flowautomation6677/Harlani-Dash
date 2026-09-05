/**
 * mailer.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/notifications/mailer.ts.
 * Mock de envio de e-mail — sem provedor real integrado ainda (SendGrid,
 * Resend etc. ficam para uma fase futura). Só garante a interface estável
 * que a rota de provisionamento depende.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendSetPasswordEmail } from '@/lib/notifications/mailer';

describe('sendSetPasswordEmail (mock)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve resolver sem lançar erro', async () => {
    await expect(sendSetPasswordEmail('novo.cliente@example.com', 'Novo Cliente')).resolves.not.toThrow();
  });

  it('deve registrar o envio (mock) com o e-mail do destinatário', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendSetPasswordEmail('novo.cliente@example.com', 'Novo Cliente');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('novo.cliente@example.com'));
  });
});
