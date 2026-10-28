import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrackingEvent, TrackingEventDocument } from '../../schemas/tracking-event.schema';
import { CreateTrackingEventDto } from './dto/create-tracking-event.dto';

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(TrackingEvent.name)
    private readonly trackingModel: Model<TrackingEventDocument>,
  ) {}

  async createEvent(
    dto: CreateTrackingEventDto,
    ip?: string,
    userAgent?: string,
  ): Promise<TrackingEvent> {
    const event = await this.trackingModel.create({
      visitorId: dto.visitorId,
      sessionId: dto.sessionId,
      page: dto.page,
      referer: dto.referer,
      event: dto.event ?? 'page_view',
      entityType: dto.entityType,
      entityId: dto.entityId,
      entitySlug: dto.entitySlug,
      ip,
      userAgent,
      metadata: dto.metadata,
    });
    return event;
  }


  async getMetrics() {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Agrégation par jour pour les 30 derniers jours
    const dailyStats = await this.trackingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
        },
      },
      {
        $project: {
          date: '$_id',
          views: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          _id: 0,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // Stats globales
    const [totalViews, uniqueVisitorsSet, pageViewsByPage] = await Promise.all([
      this.trackingModel.countDocuments({ createdAt: { $gte: last30Days } }),
      this.trackingModel.distinct('visitorId', { createdAt: { $gte: last30Days } }),
      this.trackingModel.aggregate([
        { $match: { createdAt: { $gte: last30Days }, event: 'page_view' } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Stats des 7 derniers jours
    const views7Days = await this.trackingModel.countDocuments({ createdAt: { $gte: last7Days } });
    const uniqueVisitors7Days = (
      await this.trackingModel.distinct('visitorId', { createdAt: { $gte: last7Days } })
    ).length;

    return {
      daily: dailyStats,
      summary: {
        totalViews,
        uniqueVisitors: uniqueVisitorsSet.length,
        viewsLast7Days: views7Days,
        uniqueVisitorsLast7Days: uniqueVisitors7Days,
      },
      topPages: pageViewsByPage.map((p) => ({
        page: p._id,
        count: p.count,
      })),
    };
  }

  async getActiveVisitors(minutes: number = 5) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const activeVisitors = await this.trackingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoff },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$visitorId',
          lastSeen: { $first: '$createdAt' },
          lastPage: { $first: '$page' },
          lastEvent: { $first: '$event' },
          sessionId: { $first: '$sessionId' },
          ip: { $first: '$ip' },
          userAgent: { $first: '$userAgent' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          visitorId: '$_id',
          lastSeen: 1,
          page: '$lastPage',
          event: '$lastEvent',
          sessionId: 1,
          ip: 1,
          userAgent: 1,
          eventsCount: '$count',
          _id: 0,
        },
      },
      {
        $sort: { lastSeen: -1 },
      },
    ]);

    return {
      count: activeVisitors.length,
      visitors: activeVisitors,
      minutes,
    };
  }

  async getPublicPagesStats(days: number = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.trackingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from },
          event: 'page_view',
          entityType: { $exists: false },
        },
      },
      {
        $group: {
          _id: '$page',
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
        },
      },
      {
        $project: {
          page: '$_id',
          views: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          _id: 0,
        },
      },
      {
        $sort: { views: -1 },
      },
    ]);

    return {
      days,
      pages: stats,
    };
  }

  async getEntityStats(days: number = 30, entityType?: string) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const match: Record<string, unknown> = {
      createdAt: { $gte: from },
      event: 'page_view',
      entityType: { $exists: true, $ne: null },
    };

    if (entityType) {
      match['entityType'] = entityType;
    }

    const stats = await this.trackingModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            entityType: '$entityType',
            entitySlug: '$entitySlug',
            entityId: '$entityId',
            page: '$page',
          },
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
        },
      },
      {
        $project: {
          entityType: '$_id.entityType',
          entityId: '$_id.entityId',
          entitySlug: '$_id.entitySlug',
          page: '$_id.page',
          views: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          _id: 0,
        },
      },
      {
        $sort: { views: -1 },
      },
    ]);

    return {
      days,
      entities: stats,
    };
  }
}

