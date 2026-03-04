import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Validation schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Ogiltig email-adress')
    .min(5, 'Email måste vara minst 5 tecken')
    .max(100, 'Email får inte vara längre än 100 tecken')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Lösenord måste vara minst 8 tecken')
    .max(128, 'Lösenord får inte vara längre än 128 tecken')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Lösenord måste innehålla minst en stor bokstav, en liten bokstav, en siffra och ett specialtecken')
});

export const projectSchema = z.object({
  title: z.string()
    .min(3, 'Titel måste vara minst 3 tecken')
    .max(200, 'Titel får inte vara längre än 200 tecken')
    .trim(),
  description: z.string()
    .min(10, 'Beskrivning måste vara minst 10 tecken')
    .max(2000, 'Beskrivning får inte vara längre än 2000 tecken')
    .trim(),
  address: z.string()
    .min(5, 'Adress måste vara minst 5 tecken')
    .max(300, 'Adress får inte vara längre än 300 tecken')
    .trim(),
  clientName: z.string()
    .min(2, 'Klientnamn måste vara minst 2 tecken')
    .max(100, 'Klientnamn får inte vara längre än 100 tecken')
    .trim(),
  clientEmail: z.string()
    .email('Ogiltig email-adress för klient')
    .transform(email => email.toLowerCase().trim()),
  clientPhone: z.string()
    .regex(/^[\+]?[0-9\s\-\(\)]{8,20}$/, 'Ogiltigt telefonnummer')
    .optional(),
  estimatedHours: z.number()
    .min(0.1, 'Uppskattade timmar måste vara minst 0.1')
    .max(10000, 'Uppskattade timmar får inte vara mer än 10000')
    .optional(),
  estimatedCost: z.number()
    .min(0, 'Uppskattad kostnad måste vara minst 0')
    .max(10000000, 'Uppskattad kostnad får inte vara mer än 10 miljoner')
    .optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  deadline: z.string().datetime().optional()
});

export const reportSchema = z.object({
  projectId: z.string().uuid('Ogiltigt projekt-ID'),
  title: z.string()
    .min(3, 'Titel måste vara minst 3 tecken')
    .max(200, 'Titel får inte vara längre än 200 tecken')
    .trim(),
  workDescription: z.string()
    .min(10, 'Arbetsbeskrivning måste vara minst 10 tecken')
    .max(5000, 'Arbetsbeskrivning får inte vara längre än 5000 tecken')
    .trim(),
  hoursWorked: z.number()
    .min(0.1, 'Arbetstimmar måste vara minst 0.1')
    .max(24, 'Arbetstimmar får inte vara mer än 24 per rapport'),
  materialsUsed: z.array(z.object({
    name: z.string().min(1).max(100),
    quantity: z.number().min(0),
    unit: z.string().min(1).max(20),
    cost: z.number().min(0).optional()
  })).max(50, 'Högst 50 material per rapport'),
  progressPercent: z.number()
    .min(0, 'Framsteg kan inte vara mindre än 0%')
    .max(100, 'Framsteg kan inte vara mer än 100%'),
  nextSteps: z.string().max(1000, 'Nästa steg får inte vara längre än 1000 tecken').optional(),
  issues: z.string().max(1000, 'Problem får inte vara längre än 1000 tecken').optional()
});

// Profile update schemas
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Namn måste vara minst 2 tecken')
    .max(100, 'Namn får inte vara längre än 100 tecken')
    .trim()
    .optional(),
  phone: z.string()
    .regex(/^[\+]?[0-9\s\-\(\)]{8,20}$/, 'Ogiltigt telefonnummer')
    .optional()
    .or(z.literal('')),
  company: z.string()
    .max(100, 'Företagsnamn får inte vara längre än 100 tecken')
    .trim()
    .optional()
    .or(z.literal(''))
});

export const updateEmailSchema = z.object({
  newEmail: z.string()
    .email('Ogiltig email-adress')
    .min(5, 'Email måste vara minst 5 tecken')
    .max(100, 'Email får inte vara längre än 100 tecken')
    .transform(email => email.toLowerCase().trim()),
  currentPassword: z.string()
    .min(1, 'Nuvarande lösenord krävs för att ändra email')
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Nuvarande lösenord krävs'),
  newPassword: z.string()
    .min(8, 'Nytt lösenord måste vara minst 8 tecken')
    .max(128, 'Nytt lösenord får inte vara längre än 128 tecken')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Nytt lösenord måste innehålla minst en stor bokstav, en liten bokstav, en siffra och ett specialtecken'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword']
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Ogiltig email-adress')
    .min(5, 'Email måste vara minst 5 tecken')
    .max(100, 'Email får inte vara längre än 100 tecken')
    .transform(email => email.toLowerCase().trim())
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token krävs'),
  newPassword: z.string()
    .min(8, 'Nytt lösenord måste vara minst 8 tecken')
    .max(128, 'Nytt lösenord får inte vara längre än 128 tecken')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Nytt lösenord måste innehålla minst en stor bokstav, en liten bokstav, en siffra och ett specialtecken'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword']
});

// Validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize and validate request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Valideringsfel',
          errors
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Ogiltig data'
      });
    }
  };
}

// Sanitize strings to prevent XSS
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate file uploads
export const fileUploadSchema = z.object({
  mimetype: z.enum([
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'application/pdf'
  ], { errorMap: () => ({ message: 'Endast JPEG, PNG, WebP, GIF och PDF-filer är tillåtna' }) }),
  size: z.number()
    .max(10 * 1024 * 1024, 'Filen får inte vara större än 10MB')
});

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return next();
  }

  try {
    fileUploadSchema.parse({
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Ogiltig fil'
    });
  }
}
