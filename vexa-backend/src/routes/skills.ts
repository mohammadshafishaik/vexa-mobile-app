import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AVAILABLE_SERVICE_CATEGORIES, normalizeServiceCategory } from '../utils/serviceCategories';

const router = Router();

// ─── GET /api/skills/categories — list all available categories ──
router.get('/categories', authMiddleware, async (_req: Request, res: Response) => {
  res.json({ success: true, data: AVAILABLE_SERVICE_CATEGORIES });
});

// ─── GET /api/skills/my — get my skills ──────────────────
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const skills = await prisma.providerSkill.findMany({
      where: { providerId: req.user!.userId },
      orderBy: { categoryName: 'asc' },
    });

    res.json({ success: true, data: skills });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/skills/provider/:providerId — get a provider's skills ──
router.get('/provider/:providerId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const skills = await prisma.providerSkill.findMany({
      where: { providerId: req.params.providerId as string },
      orderBy: { categoryName: 'asc' },
    });

    res.json({ success: true, data: skills });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/skills — add a skill ─────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'PROVIDER') {
      res.status(403).json({ success: false, message: 'Only providers can manage skills' });
      return;
    }

    const { category, experienceYears } = req.body;

    if (!category) {
      res.status(400).json({ success: false, message: 'Category is required' });
      return;
    }

    const normalizedCategory = normalizeServiceCategory(category);

    if (!AVAILABLE_SERVICE_CATEGORIES.includes(normalizedCategory as any)) {
      res.status(400).json({
        success: false,
        message: `Invalid category. Available: ${AVAILABLE_SERVICE_CATEGORIES.join(', ')}`,
      });
      return;
    }

    // Check if skill already exists
    const existing = await prisma.providerSkill.findUnique({
      where: {
        providerId_categoryName: {
          providerId: req.user!.userId,
          categoryName: normalizedCategory,
        },
      },
    });

    if (existing) {
      // Update experience years
      const updated = await prisma.providerSkill.update({
        where: { id: existing.id },
        data: { experienceYears: Number(experienceYears) || 0 },
      });
      res.json({ success: true, data: updated });
      return;
    }

    const skill = await prisma.providerSkill.create({
      data: {
        providerId: req.user!.userId,
        categoryName: normalizedCategory,
        experienceYears: Number(experienceYears) || 0,
      },
    });

    res.status(201).json({ success: true, data: skill });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/skills/bulk — set multiple skills at once ──
router.post('/bulk', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'PROVIDER') {
      res.status(403).json({ success: false, message: 'Only providers can manage skills' });
      return;
    }

    const { skills } = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      res.status(400).json({ success: false, message: 'Skills array is required' });
      return;
    }

    // Validate all categories
    const validated = skills
      .map((s: any) => ({
        categoryName: normalizeServiceCategory(s.category),
        experienceYears: Number(s.experienceYears) || 0,
      }))
      .filter((s) => AVAILABLE_SERVICE_CATEGORIES.includes(s.categoryName as any));

    if (validated.length === 0) {
      res.status(400).json({ success: false, message: 'No valid skills provided' });
      return;
    }

    // Delete existing skills and recreate in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.providerSkill.deleteMany({
        where: { providerId: req.user!.userId },
      });

      await tx.providerSkill.createMany({
        data: validated.map((s) => ({
          providerId: req.user!.userId,
          categoryName: s.categoryName,
          experienceYears: s.experienceYears,
        })),
      });

      return tx.providerSkill.findMany({
        where: { providerId: req.user!.userId },
        orderBy: { categoryName: 'asc' },
      });
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/skills/:id — remove a skill ────────────
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const skill = await prisma.providerSkill.findUnique({
      where: { id: req.params.id as string },
    });

    if (!skill) {
      res.status(404).json({ success: false, message: 'Skill not found' });
      return;
    }

    if (skill.providerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'You can only delete your own skills' });
      return;
    }

    await prisma.providerSkill.delete({ where: { id: skill.id } });

    res.json({ success: true, data: { message: 'Skill removed' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
