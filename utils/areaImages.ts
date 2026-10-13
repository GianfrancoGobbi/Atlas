// Fotos del sitio público (portada y fichas de áreas).
// Son fotos de stock de Pexels (licencia Pexels: uso libre, también comercial, sin atribución obligatoria).
// Para usar fotos propias, reemplazá el archivo en public/images manteniendo el mismo nombre.

export interface SiteImage {
  src: string;
  alt: string;
  credit: string; // Autor y página original en Pexels
}

export const HERO_IMAGE: SiteImage = {
  src: '/images/portada.webp',
  alt: 'Niño sonriendo mientras juega con juguetes de madera',
  credit: 'cottonbro studio - https://www.pexels.com/photo/3661288/',
};

export const ABOUT_IMAGE: SiteImage = {
  src: '/images/sobre-nosotros.webp',
  alt: 'Profesional acompañando a una niña en una actividad en un consultorio luminoso',
  credit: 'Artem Podrez - https://www.pexels.com/photo/6990592/',
};

export type AreaKey =
  | 'psicologia'
  | 'fonoaudiologia'
  | 'psicopedagogia'
  | 'pedagogiaTerapeutica'
  | 'acompanamientoTerapeutico'
  | 'integracionEscolar';

const AREA_IMAGES: Partial<Record<AreaKey, SiteImage>> = {
  psicologia: {
    src: '/images/areas/psicologia.webp',
    alt: 'Terapeuta usando tarjetas de emociones con una niña',
    credit: 'Gustavo Fring - https://www.pexels.com/photo/7447266/',
  },
  fonoaudiologia: {
    src: '/images/areas/fonoaudiologia.webp',
    alt: 'Profesional mostrando tarjetas con palabras e ilustraciones',
    credit: 'Gustavo Fring - https://www.pexels.com/photo/7156130/',
  },
  psicopedagogia: {
    src: '/images/areas/psicopedagogia.webp',
    alt: 'Profesional leyendo un libro junto a una niña',
    credit: 'Mikhail Nilov - https://www.pexels.com/photo/8923031/',
  },
  pedagogiaTerapeutica: {
    src: '/images/areas/pedagogia-terapeutica.webp',
    alt: 'Docente acompañando a una niña en una actividad con plastilina',
    credit: 'Ksenia Chernaya - https://www.pexels.com/photo/8537196/',
  },
  acompanamientoTerapeutico: {
    src: '/images/areas/acompanamiento-terapeutico.webp',
    alt: 'Adulta caminando de la mano de un niño en un parque',
    credit: 'Barbara Olsen - https://www.pexels.com/photo/7880388/',
  },
};

// Para áreas sin foto propia (por ejemplo, una nueva cargada en la base).
const DEFAULT_AREA_IMAGE: SiteImage = {
  src: '/images/areas/general.webp',
  alt: 'Adulto y niño dibujando juntos con lápices de colores',
  credit: 'Vitaly Gariev - https://www.pexels.com/photo/36713062/',
};

// Identifica el área por palabra clave, sin tildes ni mayúsculas, para que funcione
// aunque el nombre en la base tenga variaciones o errores de tipeo (ej.: "Fonoaudilogía").
export const getAreaKey = (nombre: string): AreaKey | null => {
  const n = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (n.includes('fono')) return 'fonoaudiologia';
  if (n.includes('psicopedagog')) return 'psicopedagogia'; // Antes que 'psicolog' y 'pedagog'
  if (n.includes('psicolog')) return 'psicologia';
  if (n.includes('pedagog')) return 'pedagogiaTerapeutica';
  if (n.includes('acompa')) return 'acompanamientoTerapeutico';
  if (n.includes('integracion')) return 'integracionEscolar';
  return null;
};

export const getAreaImage = (nombre: string): SiteImage => {
  const key = getAreaKey(nombre);
  return (key && AREA_IMAGES[key]) || DEFAULT_AREA_IMAGE;
};
