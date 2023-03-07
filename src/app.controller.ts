import {Controller, Get, Query} from '@nestjs/common';
import {PersistenceService} from "./persistence/persistence.service";

@Controller("/api/v1")
export class AppController {
  constructor(private readonly persistence: PersistenceService) {
  }

  @Get('/overview')
  async getOverview() {
    const pipeline = AppController.getAvgDurationQueryPipeline();
    const [count, avgGrouping] = await Promise.all([
      this.persistence.messages.countDocuments().exec(),
      this.persistence.messages.aggregate(pipeline).exec()
    ])
    return {
      totalMessages: count,
      averageDeliveryDuration: Math.floor(avgGrouping[0]?.averageDeliveryDuration ?? 0),
      averageCost: 0
    }
  }

  @Get('/messages')
  async getMessages(@Query('page') page = 1, @Query('limit') limit = 10) {
    const [messages, count] = await Promise.all([
      this.persistence.messages.find().skip((page - 1) * limit).limit(limit).exec(),
      this.persistence.messages.countDocuments().exec()
    ]);

    return {
      messages: messages.map(msg => {
        return {
          hash: msg.hash,
          sourceChainId: msg.sourceChainId,
          targetChainId: msg.targetChainId,
          sourceChainTxHash: msg.sourceChainTxHash,
          targetChainTxHash: msg.targetChainTxHash,
          sourceChainTxTimestamp: msg.sourceChainTxTimestamp,
          targetChainTxTimestamp: msg.targetChainTxTimestamp,
          l1BlockNumber: msg.l1BlockNumber
        }
      }),
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  }

  @Get('/light-client-updates')
  async getLightClientUpdates(@Query('page') page = 1, @Query('limit') limit = 10) {
    const [updates, count] = await Promise.all([
      this.persistence.lightClientUpdates.find().skip((page - 1) * limit).limit(limit).exec(),
      this.persistence.lightClientUpdates.countDocuments().exec()
    ]);

    return {
      updates: updates.map(update => {
        return {
          chainId: update.chainId,
          transactionHash: update.transactionHash,
          transactionTimestamp: update.transactionTimestamp,
          slot: update.slot,
          l1BlockNumber: update.l1BlockNumber,
          l1BlockTimestamp: update.l1BlockTimestamp,
          executionRoot: update.executionRoot
        }
      }),
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  }

  private static getAvgDurationQueryPipeline() {
    return [
      {
        $match: {
          targetChainTxTimestamp: {$ne: 0}
        }
      },
      {
        $project: {
          duration: {$subtract: ['$targetChainTxTimestamp', '$sourceChainTxTimestamp']}
        }
      },
      {
        $group: {
          _id: null,
          averageDeliveryDuration: {$avg: '$duration'}
        }
      }
    ];
  }
}
