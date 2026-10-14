import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeName(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}
export function validBirthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year,month,day] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(year,month-1,day));
  return dt.getUTCFullYear()===year && dt.getUTCMonth()===month-1 && dt.getUTCDate()===day
    && year>=1900 && dt.getTime()<=Date.now();
}
export function validateLookup(fullName,birthDate) {
  const name = normalizeName(fullName);
  if (name.length<5 || name.length>140 || name.split(' ').length<2 || !validBirthDate(birthDate)) {
    throw Error('Informe o nome completo e a data de nascimento correta.');
  }
  return {name,birthDate};
}
export function generateAccessCode() {
  const bytes = randomBytes(12);
  return [...bytes].map(byte=>ALPHABET[byte%32]).join('');
}
export function normalizeCode(code) {
  return String(code??'').replace(/[\s-]/g,'').toUpperCase();
}
export function hashCode(code) {
  return createHash('sha256').update(normalizeCode(code)).digest('hex');
}
export function codesEqual(expectedHash,code) {
  if (typeof expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual=Buffer.from(hashCode(code),'hex');
  return timingSafeEqual(Buffer.from(expectedHash,'hex'),actual);
}
export function validateChoice(value) {
  const guardian=String(value?.guardian??'').trim();
  const phone=String(value?.phone??'').replace(/[^\d+]/g,'').trim();
  const mode=value?.mode;
  const quantity=mode==='bus'?Number(value?.quantity):0;
  if (guardian.length<2||guardian.length>100) throw Error('Informe o nome do responsável.');
  if (!/^\+?\d{10,13}$/.test(phone)) throw Error('Informe um telefone com DDD válido.');
  if (!['bus','car','no'].includes(mode)) throw Error('Escolha ônibus, carro ou ausência.');
  if (!Number.isInteger(quantity)||quantity<0||quantity>100||(mode==='bus'&&quantity<1)) {
    throw Error('A quantidade de lugares é inválida.');
  }
  return {guardian,phone,mode,quantity};
}
export function categoryLabel(code) {
  const match=String(code||'').match(/^SUB_(\d{1,2})$/);
  return match?'Sub-'+match[1].padStart(2,'0'):'Outros';
}
