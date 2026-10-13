/** E-mails administrativos espelhados das regras do Firestore do projeto yoka-transporte. */
const ADMIN_EMAILS = new Set([
  'joao.gerd@gmail.com',
  'adyokafutsal@gmail.com'
]);

export function isConfiguredAdminEmail(email) {
  return ADMIN_EMAILS.has(String(email ?? '').trim().toLowerCase());
}
