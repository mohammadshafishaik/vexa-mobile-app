import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  recommendBid,
  recommendChatReplies,
  recommendJobDescription,
} from '../utils/recommendationEngine';

const router = Router();

router.post('/job-description', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = recommendJobDescription({
      title: req.body?.title,
      description: req.body?.description,
      category: req.body?.category,
      location: req.body?.location,
      budget: Number(req.body?.budget),
      urgency: req.body?.urgency,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bid', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = recommendBid({
      jobTitle: req.body?.jobTitle,
      jobDescription: req.body?.jobDescription,
      jobCategory: req.body?.jobCategory,
      currentLowestBid: Number(req.body?.currentLowestBid),
      myBidAmount: Number(req.body?.myBidAmount),
      estimatedDuration: req.body?.estimatedDuration,
      message: req.body?.message,
      providerExperienceYears: Number(req.body?.providerExperienceYears),
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = recommendChatReplies({
      latestMessage: req.body?.latestMessage,
      jobTitle: req.body?.jobTitle,
      draft: req.body?.draft,
      jobStatus: req.body?.jobStatus,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
