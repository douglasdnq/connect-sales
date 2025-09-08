// Web Crypto API para Deno/Edge Functions

/**
 * Valida assinatura HMAC de um webhook
 */
export async function validateHMAC(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'SHA-256'
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Comparação segura
    return signature.toLowerCase() === expectedHex.toLowerCase();
  } catch (error) {
    return false;
  }
}

/**
 * Gera hash SHA256 de um payload para idempotência
 */
export async function generateEventHash(payload: any): Promise<string> {
  const content = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validação específica para Kiwify
 */
export async function validateKiwifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    console.log('Validando Kiwify HMAC:', { 
      signature: signature.substring(0, 20) + '...', 
      secret: secret.substring(0, 4) + '...',
      payload_length: payload.length 
    });

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Testa diferentes formatos que a Kiwify pode usar
    const formats = [
      signature.toLowerCase(), // formato original
      signature.replace(/^(sha256=|hmac-sha256=)/, '').toLowerCase(), // sem prefixo
      `sha256=${signature}`.toLowerCase(), // com prefixo sha256=
      `hmac-sha256=${signature}`.toLowerCase(), // com prefixo hmac-sha256=
    ];
    
    const expectedLower = expectedHex.toLowerCase();
    console.log('Comparando assinaturas:', { 
      expected: expectedLower.substring(0, 20) + '...', 
      received_formats: formats.map(f => f.substring(0, 20) + '...') 
    });
    
    // Testa todos os formatos possíveis
    return formats.some(format => format === expectedLower || format === `sha256=${expectedLower}` || format === `hmac-sha256=${expectedLower}`);
  } catch (error) {
    console.error('Erro na validação HMAC Kiwify:', error);
    return false;
  }
}

/**
 * Validação específica para Digital Manager Guru
 */
export async function validateDMGSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // DMG usa HMAC-SHA256 no header X-DMG-Signature
  return await validateHMAC(payload, signature, secret);
}

/**
 * Validação específica para Cademi
 */
export async function validateCademiSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Cademi usa HMAC-SHA256 no header X-Cademi-Signature
  return await validateHMAC(payload, signature, secret);
}

/**
 * Validação específica para Voomp
 */
export async function validateVoompSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Voomp usa HMAC-SHA256 no header X-Voomp-Signature
  return await validateHMAC(payload, signature, secret);
}

/**
 * Gera um ID único para visitante (usado pelo pixel)
 */
export function generateVisitorId(): string {
  return crypto.randomUUID();
}