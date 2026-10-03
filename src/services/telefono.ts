// Forma canónica de un teléfono para guardar y buscar referencias de cliente.
// El panel recibe "51906828331" de WhatsApp pero el operador teclea "906828331":
// sin normalizar, la nota se guardaba en un formato y se buscaba en el otro.
export const normalizarTelefono = (raw: string): string => {
    // WhatsApp puede mandar "51988938939:0@s.whatsapp.net": el ":0" es el
    // dispositivo, no parte del número. Quitar solo no-dígitos lo pegaba al final.
    const base = String(raw ?? '').split('@')[0].split(':')[0];
    const d = base.replace(/\D/g, '');
    return d.length === 9 && d.startsWith('9') ? `51${d}` : d;
};

// Formas bajo las que puede estar guardado un número (incluye la legacy de 9
// dígitos, de antes de normalizar). Otros largos (extranjeros, LID) van tal cual.
export const variantesTelefono = (raw: string): string[] => {
    const n = normalizarTelefono(raw);
    return n.length === 11 && n.startsWith('51') ? [n, n.slice(2)] : [n];
};
