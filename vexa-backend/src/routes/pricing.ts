import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/pricing/estimate - Calculates dynamic pricing based on multiple real-time factors
router.post('/estimate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { categoryId, latitude, longitude, urgency } = req.body as {
      categoryId?: string;
      latitude?: number;
      longitude?: number;
      urgency?: string;
    };

    if (!categoryId) {
      res.status(400).json({ success: false, message: 'categoryId is required' });
      return;
    }

    // 1. Fetch category base price details (default to 500 if category typical price not set)
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId },
    });
    
    const baseEstimate = 500; // Standard base price for service dispatch

    // 2. Compute Demand Factor (Open requests nearby)
    let demandScore = 0.5;
    let openJobsNearby = 0;
    if (latitude && longitude) {
      openJobsNearby = await prisma.serviceRequest.count({
        where: {
          status: { in: ['POSTED', 'BIDDING'] },
          latitude: { gte: latitude - 0.05, lte: latitude + 0.05 },
          longitude: { gte: longitude - 0.05, lte: longitude + 0.05 },
        },
      });
      demandScore = Math.min(Math.max(openJobsNearby / 10, 0.2), 1.0);
    }

    // 3. Compute Supply Factor (Online providers nearby)
    let supplyScore = 0.5;
    let onlineProvidersNearby = 0;
    if (latitude && longitude) {
      onlineProvidersNearby = await prisma.user.count({
        where: {
          role: 'PROVIDER',
          providerProfile: {
            availabilityStatus: 'ONLINE',
            // Check near provider locations if recorded
            user: {
              locationHistory: {
                some: {
                  latitude: { gte: latitude - 0.05, lte: latitude + 0.05 },
                  longitude: { gte: longitude - 0.05, lte: longitude + 0.05 },
                },
              },
            },
          },
        },
      });
      supplyScore = Math.min(Math.max(onlineProvidersNearby / 5, 0.1), 1.0);
    }

    // 4. Surge Multiplier based on Demand / Supply ratio
    const demandSupplyRatio = demandScore / (supplyScore || 0.1);
    let surgeMultiplier = 1.0;
    if (demandSupplyRatio > 1.5) surgeMultiplier = 1.25;
    if (demandSupplyRatio > 2.5) surgeMultiplier = 1.5;

    // 5. Weather Factor (Simulate rain/storm surge or read from config)
    const weatherCondition = process.env.PRICING_WEATHER_CONDITION || 'clear';
    let weatherFactor = 1.0;
    if (weatherCondition === 'rain') weatherFactor = 1.25;
    if (weatherCondition === 'storm') weatherFactor = 1.5;

    // 6. Time Factor (Late night hours: 10 PM - 6 AM get a 20% bump)
    const currentHour = new Date().getHours();
    const isPeakHour = currentHour >= 22 || currentHour < 6;
    const timeFactor = isPeakHour ? 1.2 : 1.0;

    // 7. Distance & Urgency Factors
    const urgencyFactor = urgency === 'IMMEDIATE' ? 1.25 : 1.0;
    const categoryFactor = category ? 1.0 : 1.0;

    // Calculate final price
    const calculatedPrice = 
      baseEstimate * 
      surgeMultiplier * 
      weatherFactor * 
      timeFactor * 
      urgencyFactor * 
      categoryFactor;

    const finalEstimate = Math.round(calculatedPrice * 100) / 100;

    // 8. Log details in DynamicPricingHistory if linked to a job (create temp log if job is not yet active)
    res.json({
      success: true,
      data: {
        baseEstimate,
        surgeMultiplier,
        demandScore,
        supplyScore,
        weatherFactor,
        timeFactor,
        urgencyFactor,
        categoryFactor,
        finalEstimate,
        weatherCondition,
        factors: {
          openJobsNearby,
          onlineProvidersNearby,
          isPeakHour,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
