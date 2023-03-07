import {Controller, Get, Query} from '@nestjs/common';
import {PersistenceService} from "./persistence/persistence.service";

@Controller("/api/v1")
export class AppController {
  constructor(private readonly persistence: PersistenceService) {
  }

  @Get('/overview')
  async getOverview() {
    const [count] = await Promise.all([
      this.persistence.messages.countDocuments().exec()
    ])
    return {
      totalMessages: count,
      averageDeliveryDuration: 0,
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
        const {
          hash,
          sourceChainId,
          targetChainId,
          sourceChainTxHash,
          targetChainTxHash,
          sourceChainTxTimestamp,
          targetChainTxTimestamp,
          l1BlockNumber
        } = msg;
        return {
          hash,
          sourceChainId,
          targetChainId,
          sourceChainTxHash,
          targetChainTxHash,
          sourceChainTxTimestamp,
          targetChainTxTimestamp,
          l1BlockNumber
        }
      }),
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  }

  @Get('/light-client-updates')
  async getLightClientUpdates(@Query('page') page = 1, @Query('limit') limit = 10) {
    let count = 1;
    return {
      updates: [],
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  }
}
