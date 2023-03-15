import {Controller, Get, NotFoundException, Param, Query} from '@nestjs/common';
import {PersistenceService} from "./persistence/persistence.service";

@Controller("/api/v1")
export class AppController {
  constructor(private readonly persistence: PersistenceService) {
  }

  @Get('/overview')
  async getOverview() {
    const avgDurationPipeline = AppController.getAvgDurationQueryPipeline();
    const avgCostPipeline = AppController.getAvgCostQueryPipeline();
    const [count, avgDurationResult, avgCostResult] = await Promise.all([
      this.persistence.messages.countDocuments().exec(),
      this.persistence.messages.aggregate(avgDurationPipeline).exec(),
      this.persistence.messages.aggregate(avgCostPipeline).exec()
    ])
    return {
      totalMessages: count,
      averageDeliveryDuration: Math.floor(avgDurationResult[0]?.averageDeliveryDuration ?? 0),
      averageCost: avgCostResult[0]?.averageCost ?? "0"
    }
  }

  @Get('/messages')
  async getMessages(@Query('page') page = 1, @Query('limit') limit = 10) {
    const [messages, count] = await Promise.all([
      this.persistence.messages.find().sort({ sourceChainTxTimestamp: -1 }).skip((page - 1) * limit).limit(limit).exec(),
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

  private static getAvgCostQueryPipeline() {
    return [
      {
        $match: {
          stateRelayCost: {$ne: null},
          deliveryCost:  {$ne: null}
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
