import {Injectable, Logger} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";
import {Message, MessagesDocument} from "./schemas/message.schema";

@Injectable()
export class PersistenceService {

  constructor(
    @InjectModel(Message.name)
    private readonly messagesModel: Model<MessagesDocument>
  ) {
  }

  get messages() {
    return this.messagesModel;
  }
}
