import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { adminAuthMiddleware } from '../../middleware/admin/adminAuth';

const router = Router();

router.use(adminAuthMiddleware);

const dateKey = (value: Date): string => value.toISOString().slice(0, 10);

router.get('/analytics/overview', async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalAdmins,
      suspendedUsers,
      bannedUsers,
      totalJobs,
      activeJobs,
      paidJobs,
      totalDisputes,
      openDisputes,
      totalPayments,
      paymentCompletedAggregate,
      paymentRefundedAggregate,
      totalKycDocs,
      pendingKycDocs,
      openAnomalies,
      totalChatMessages,
      totalProviderSkills,
      totalPortfolioItems,
      totalCancellations,
      onlineProviders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { accountStatus: 'SUSPENDED' } }),
      prisma.user.count({ where: { accountStatus: 'BANNED' } }),
      prisma.serviceRequest.count(),
      prisma.serviceRequest.count({
        where: {
          status: {
            in: ['POSTED', 'BIDDING', 'ACCEPTED', 'ON_SITE_INSPECTION', 'MODIFICATION_REQUESTED', 'IN_PROGRESS', 'PAYMENT_PENDING'],
          },
        },
      }),
      prisma.serviceRequest.count({ where: { status: 'PAID' } }),
      prisma.dispute.count(),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } }),
      prisma.payment.count(),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { amount: true },
      }),
      prisma.kYCVerification.count(),
      prisma.kYCVerification.count({ where: { status: 'PENDING' } }),
      prisma.bidAnomaly.count({ where: { status: { in: ['OPEN', 'REVIEWED'] } } }),
      prisma.chatMessage.count(),
      prisma.providerSkill.count(),
      prisma.portfolioItem.count(),
      prisma.cancellation.count(),
      prisma.user.count({
        where: {
          role: 'PROVIDER',
          providerProfile: {
            availabilityStatus: 'ONLINE',
          },
        },
      }),
    ]);

    const grossRevenue = Number(paymentCompletedAggregate._sum.amount || 0);
    const refundedAmount = Number(paymentRefundedAggregate._sum.amount || 0);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          providers: totalProviders,
          admins: totalAdmins,
          suspended: suspendedUsers,
          banned: bannedUsers,
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          paid: paidJobs,
        },
        disputes: {
          total: totalDisputes,
          open: openDisputes,
        },
        payments: {
          total: totalPayments,
          grossRevenue,
          refundedAmount,
          netRevenue: grossRevenue - refundedAmount,
        },
        kyc: {
          totalDocuments: totalKycDocs,
          pendingDocuments: pendingKycDocs,
        },
        bidding: {
          openAnomalies,
        },
        advanced: {
          totalChatMessages,
          totalProviderSkills,
          totalPortfolioItems,
          totalCancellations,
          onlineProviders,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analytics/trends', async (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 120);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const [users, jobs, payments, disputes] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.serviceRequest.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, status: true, amount: true },
      }),
      prisma.dispute.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const rows = new Map<string, {
      date: string;
      newUsers: number;
      newJobs: number;
      newDisputes: number;
      paymentsCompleted: number;
      paymentsRefunded: number;
      revenue: number;
      refunded: number;
    }>();

    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      rows.set(key, {
        date: key,
        newUsers: 0,
        newJobs: 0,
        newDisputes: 0,
        paymentsCompleted: 0,
        paymentsRefunded: 0,
        revenue: 0,
        refunded: 0,
      });
    }

    for (const item of users) {
      const key = dateKey(item.createdAt);
      const row = rows.get(key);
      if (row) row.newUsers += 1;
    }

    for (const item of jobs) {
      const key = dateKey(item.createdAt);
      const row = rows.get(key);
      if (row) row.newJobs += 1;
    }

    for (const item of disputes) {
      const key = dateKey(item.createdAt);
      const row = rows.get(key);
      if (row) row.newDisputes += 1;
    }

    for (const item of payments) {
      const key = dateKey(item.createdAt);
      const row = rows.get(key);
      if (!row) continue;

      if (item.status === 'COMPLETED') {
        row.paymentsCompleted += 1;
        row.revenue += Number(item.amount);
      }

      if (item.status === 'REFUNDED') {
        row.paymentsRefunded += 1;
        row.refunded += Number(item.amount);
      }
    }

    res.json({ success: true, data: Array.from(rows.values()) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analytics/providers', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const providers = await prisma.user.findMany({
      where: { role: 'PROVIDER' },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        createdAt: true,
        selectedForJobs: {
          where: { status: 'PAID' },
          select: { id: true, createdAt: true },
        },
        ratingsReceived: {
          select: { overallScore: true },
        },
        paymentsReceived: {
          where: { status: 'COMPLETED' },
          select: { amount: true },
        },
      },
      take: 1000,
    });

    const scored = providers
      .map((provider) => {
        const totalCompletedJobs = provider.selectedForJobs.length;
        const totalEarnings = provider.paymentsReceived.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const avgRating = provider.ratingsReceived.length
          ? provider.ratingsReceived.reduce((sum, rating) => sum + rating.overallScore, 0) / provider.ratingsReceived.length
          : 0;

        return {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          accountStatus: provider.accountStatus,
          totalCompletedJobs,
          totalEarnings,
          avgRating,
          ratingsCount: provider.ratingsReceived.length,
          createdAt: provider.createdAt,
        };
      })
      .sort((a, b) => {
        if (b.totalCompletedJobs !== a.totalCompletedJobs) {
          return b.totalCompletedJobs - a.totalCompletedJobs;
        }
        if (b.avgRating !== a.avgRating) {
          return b.avgRating - a.avgRating;
        }
        return b.totalEarnings - a.totalEarnings;
      })
      .slice(0, limit);

    res.json({ success: true, data: scored });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
