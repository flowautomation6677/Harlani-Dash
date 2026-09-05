/**
 * Mock de envio de e-mail — nenhum provedor real (Resend, SendGrid, SES...)
 * integrado ainda. Só loga no console para não bloquear o fluxo de
 * provisionamento de tenants enquanto isso não é especificado.
 *
 * Também não existe, ainda, uma tela/rota que consuma um token de
 * "definir senha" — de propósito não fabricamos aqui um token que nada no
 * app sabe validar. Quando o fluxo de definição de senha for implementado,
 * troque este mock por um envio real (e gere/valide o token nesse momento).
 */
export async function sendSetPasswordEmail(email: string, name?: string | null): Promise<void> {
  console.log(`[mailer:mock] E-mail de definição de senha enviado para ${email} (${name || 'sem nome'}).`);
}
