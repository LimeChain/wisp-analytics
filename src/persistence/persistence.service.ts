import {Injectable, Logger} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";
import {Message, MessagesDocument} from "./schemas/message.schema";
import {LightClientUpdate, LightClientUpdateDocument} from "./schemas/light-client-update.schema";

@Injectable()
export class PersistenceService {

  constructor(
    @InjectModel(Message.name)
    private readonly messagesModel: Model<MessagesDocument>,
    @InjectModel(LightClientUpdate.name)
    private readonly lightClientUpdatesModel: Model<LightClientUpdateDocument>
  ) {
  }

  get messages() {
    return this.messagesModel;
  }

  get lightClientUpdates() {
    return this.lightClientUpdatesModel;
  }
}
