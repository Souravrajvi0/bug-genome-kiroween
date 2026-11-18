import type { Project } from '@/lib/domain/types';

/** Invented projects. They do not name real repositories, organizations or people. */
export const LUMEN: Project = {
  id: 'proj-lumen',
  name: 'Lumen Cart',
  type: 'Storefront web app',
  description: 'Invented online shop front end with a cart, coupons and checkout.',
};

export const PIGEON: Project = {
  id: 'proj-pigeon',
  name: 'Pigeon Queue',
  type: 'Job queue library',
  description: 'Invented library that reserves, runs and acknowledges background jobs.',
};

export const TESSERA: Project = {
  id: 'proj-tessera',
  name: 'Tessera Sync',
  type: 'Offline sync client',
  description: 'Invented client that keeps notes on the device and syncs them with a server.',
};

export const HARBOR: Project = {
  id: 'proj-harbor',
  name: 'Harbor Forms',
  type: 'Form library',
  description: 'Invented library for building validated, submittable web forms.',
};