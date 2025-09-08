import crypto from 'crypto';

/**
 * Valida assinatura HMAC de um webhook
 */
export function validateHMAC(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
    
    // Comparação segura contra timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Gera hash SHA256 de um payload para idempotência
 */
export function generateEventHash(payload: any): string {
  const content = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);
  
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

/**
 * Validação específica para Kiwify
 */
export function validateKiwifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Kiwify usa HMAC-SHA256 no header X-Kiwify-Signature
  return validateHMAC(payload, signature, secret);
}

/**
 * Validação específica para Digital Manager Guru
 */
export function validateDMGSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // DMG usa HMAC-SHA256 no header X-DMG-Signature
  return validateHMAC(payload, signature, secret);
}

/**
 * Validação específica para Cademi
 */
export function validateCademiSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Cademi usa HMAC-SHA256 no header X-Cademi-Signature
  return validateHMAC(payload, signature, secret);
}

/**
 * Validação específica para Voomp
 */
export function validateVoompSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Voomp usa HMAC-SHA256 no header X-Voomp-Signature
  return validateHMAC(payload, signature, secret);
}

/**
 * Gera um ID único para visitante (usado pelo pixel)
 */
export function generateVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * Criptografa dados sensíveis (opcional)
 */
export function encrypt(text: string, secret: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secret, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Descriptografa dados sensíveis (opcional)
 */
export function decrypt(encryptedText: string, secret: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secret, 'salt', 32);
  
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}