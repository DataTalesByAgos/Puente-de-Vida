import { z } from 'zod';
import {
  NEED_CATEGORIES,
  NEED_STATUSES,
  NEED_SCOPES,
  NEED_UPDATE_STATUSES,
  PRIORITIES,
  SOURCES,
  AVAILABILITY_TYPES,
  CREATED_BY_ROLES,
} from './types';

const photoUrlSchema = z.string().max(50000).nullable().optional();

export const createNeedSchema = z.object({
  clientId: z.string().max(120).optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4000),
  category: z.enum(NEED_CATEGORIES),
  subcategory: z.string().max(30).nullable().optional(),
  priority: z.enum(PRIORITIES).default('media'),
  scope: z.enum(NEED_SCOPES).default('micro'),
  parentId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  locationText: z.string().max(200).nullable().optional(),
  peopleRequired: z.number().int().min(0).nullable().optional(),
  resourcesNeeded: z.string().max(1000).nullable().optional(),
  photoUrl: photoUrlSchema,
  source: z.enum(SOURCES).default('pwa'),
  age: z.number().int().min(0).max(150).nullable().optional(),
});

export const updateNeedSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(4000).optional(),
  category: z.enum(NEED_CATEGORIES).optional(),
  subcategory: z.string().max(30).nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(NEED_STATUSES).optional(),
  parentId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  locationText: z.string().max(200).nullable().optional(),
  peopleRequired: z.number().int().min(0).nullable().optional(),
  resourcesNeeded: z.string().max(1000).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  assignedBy: z.string().max(120).nullable().optional(),
  closedBy: z.string().max(120).nullable().optional(),
  comments: z.string().max(2000).nullable().optional(),
});

export const needQuerySchema = z.object({
  status: z.enum(NEED_STATUSES).optional(),
  category: z.enum(NEED_CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  scope: z.enum(NEED_SCOPES).optional(),
  parentId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().optional(),
  createdByRole: z.enum(CREATED_BY_ROLES).optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const pushNeedsSchema = z.object({
  needs: z.array(createNeedSchema).max(200),
});

export const pullNeedsSchema = z.object({
  since: z.string().datetime().optional(),
});

export const createNeedUpdateSchema = z.object({
  status: z.enum(NEED_UPDATE_STATUSES),
  photos: z.array(z.string().max(50000)).max(5).default([]),
  observations: z.string().max(2000).nullable().optional(),
});

export const volunteerProfileSchema = z.object({
  categoriesOfInterest: z.array(z.enum(NEED_CATEGORIES)).default([]),
  skills: z.array(z.string().max(60)).max(20).default([]),
  availability: z.enum(AVAILABILITY_TYPES).default('programada'),
  geoZone: z.string().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  maxDistanceKm: z.number().int().min(0).max(1000).nullable().optional(),
});

export const loginSchema = z.object({
  user: z.string().min(1).max(120),
  pass: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  birthDate: z.string().optional(),
  userType: z.enum(['citizen', 'volunteer', 'coordinator', 'organization']),
  state: z.string().max(100).optional(),
  municipality: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
  occupation: z.string().max(100).optional(),
  inviteCode: z.string().length(8).optional(),
  documentId: z.string().max(20).optional(),
  password: z.string().min(6).max(200),
});
