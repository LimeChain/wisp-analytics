import {Controller, Get, NotFoundException, Param, Query} from '@nestjs/common';
import {PersistenceService} from "./persistence/persistence.service";

@Controller("/api/v1")
export class AppController {
  constructor(private readonly persistence: PersistenceService) {
  }

  @Get('/overview')
  async getOverview() {
    const messageDurationsPipeline = AppController.getMessageDurations();
    const avgCostPipeline = AppController.getAvgCostQueryPipeline();
    const [count, messageDurations, avgCostResult] = await Promise.all([
      this.persistence.messages.countDocuments().exec(),
      this.persistence.messages.aggregate(messageDurationsPipeline).exec(),
      this.persistence.messages.aggregate(avgCostPipeline).exec()
    ])
    return {
      totalMessages: count,
      averageDeliveryDuration: median(messageDurations.map(d => d.duration)),
      averageCost: avgCostResult[0]?.averageCost ?? "0"
    }
  }

  @Get('/messages')
  async getMessages(@Query('page') page = 1, @Query('limit') limit = 10) {
    const [messages, count] = await Promise.all([
      this.persistence.messages.find().sort({sourceChainTxTimestamp: -1}).skip((page - 1) * limit).limit(limit).exec(),
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

  @Get('/messages/:hash')
  async getMessageDetails(@Param('hash') hash: string) {
    const msg = await this.persistence.messages.findOne({hash: hash});
    if (!msg) {
      throw new NotFoundException('Message not found');
    } else {
      return {
        hash: msg.hash,
        index: msg.index,
        user: msg.user,
        sourceChainId: msg.sourceChainId,
        targetChainId: msg.targetChainId,
        sourceChainTxHash: msg.sourceChainTxHash,
        sourceChainTxBlockNumber: msg.l2BlockNumber,
        targetChainTxHash: msg.targetChainTxHash,
        sourceChainTxTimestamp: msg.sourceChainTxTimestamp,
        targetChainTxTimestamp: msg.targetChainTxTimestamp,
        targetChainTxBlockNumber: msg.targetChainTXBlockNumber,
        l1BlockNumber: msg.l1BlockNumber,
        l1ChainTxHash: msg.l1ChainTxHash,
        l1BlockTimestamp: msg.l1BlockTimestamp,
        destinationUserApplication: msg.target,
        payload: msg.payload,
        stateRelayCost: msg.stateRelayCost,
        deliveryCost: msg.deliveryCost
      };
    }
  }

  @Get('/light-client-updates')
  async getLightClientUpdates(@Query('page') page = 1, @Query('limit') limit = 10) {
    const [updates, count] = await Promise.all([
      this.persistence.lightClientUpdates.find().sort({transactionTimestamp: -1}).skip((page - 1) * limit).limit(limit).exec(),
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

  private static getMessageDurations() {
    return [
      {
        $match: {
          targetChainTxTimestamp: {$ne: 0}
        }
      }, {
        $project: {
          duration: {$subtract: ['$targetChainTxTimestamp', '$sourceChainTxTimestamp']}
        }
      }
    ];
  }

  private static getAvgCostQueryPipeline() {
    return [
      {
        $match: {
          stateRelayCost: {$ne: null},
          deliveryCost: {$ne: null}
        },
      },
      {
        $project: {
          totalCost: {
            $sum: [{$toLong: '$stateRelayCost'}, {$toLong: '$deliveryCost'}],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageCost: {$avg: '$totalCost'},
        },
      },
    ];
  }
}

function median(arr: number[]): number {
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
