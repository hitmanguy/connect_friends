import { Connection } from "../model/connection";
import { User } from "../model/auth";
import { ConnectionLedger } from "../model/connectionLedger";
import mongoose from "mongoose";

export class ChangeStreamService {
  private static instance: ChangeStreamService;
  private connectionChangeStream: any = null;
  private userChangeStream: any = null;

  private constructor() {}

  public static getInstance(): ChangeStreamService {
    if (!ChangeStreamService.instance) {
      ChangeStreamService.instance = new ChangeStreamService();
    }
    return ChangeStreamService.instance;
  }

  public startMonitoring() {
    this.startConnectionMonitoring();
    this.startUserMonitoring();
  }

  private startConnectionMonitoring() {
    try {
      this.connectionChangeStream = Connection.watch([
        { $match: { operationType: { $in: ["insert", "delete", "update"] } } },
      ]);

      this.connectionChangeStream.on("change", async (change: any) => {
        console.log("Connection change detected:", change.operationType);

        try {
          switch (change.operationType) {
            case "insert":
              await this.logConnectionCreated(change.fullDocument);
              break;
            case "delete":
              await this.logConnectionDeleted(change.documentKey._id);
              break;
            case "update":
              await this.logConnectionUpdated(
                change.documentKey._id,
                change.updateDescription
              );
              break;
          }
        } catch (error) {
          console.error("Error processing connection change:", error);
        }
      });

      this.connectionChangeStream.on("error", (error: any) => {
        console.error("Connection change stream error:", error);
        // Implement reconnection logic here
        setTimeout(() => this.startConnectionMonitoring(), 5000);
      });

      console.log("Connection change stream started");
    } catch (error) {
      console.error("Failed to start connection monitoring:", error);
    }
  }

  private startUserMonitoring() {
    try {
      this.userChangeStream = User.watch([
        {
          $match: {
            operationType: { $in: ["insert", "update"] },
            "fullDocument.UserRole": { $ne: "host" },
          },
        },
      ]);

      this.userChangeStream.on("change", async (change: any) => {
        console.log("User change detected:", change.operationType);

        try {
          if (change.operationType === "insert") {
            await this.createInitialHostConnection(change.fullDocument);
          }
        } catch (error) {
          console.error("Error processing user change:", error);
        }
      });

      console.log("User change stream started");
    } catch (error) {
      console.error("Failed to start user monitoring:", error);
    }
  }

  private async logConnectionCreated(connection: any) {
    await ConnectionLedger.create({
      type: "CREATED",
      initiatorId: connection.createdBy,
      userA: connection.userA,
      userB: connection.userB,
      connectionId: connection._id,
      microCircleId: connection.microCircleId,
      notes: connection.notes,
      metadata: {
        timestamp: new Date(),
        source: "change_stream",
        action: "auto_logged",
      },
    });
  }

  private async logConnectionDeleted(connectionId: any) {
    // Since we can't get the deleted document, we need to look it up in the ledger
    const lastEntry = await ConnectionLedger.findOne({
      connectionId: connectionId,
      type: "CREATED",
    }).sort({ createdAt: -1 });

    if (lastEntry) {
      await ConnectionLedger.create({
        type: "DELETED",
        initiatorId: lastEntry.initiatorId,
        userA: lastEntry.userA,
        userB: lastEntry.userB,
        connectionId: connectionId,
        microCircleId: lastEntry.microCircleId,
        metadata: {
          timestamp: new Date(),
          source: "change_stream",
          action: "auto_logged",
        },
      });
    }
  }

  private async logConnectionUpdated(
    connectionId: any,
    updateDescription: any
  ) {
    const connection = await Connection.findById(connectionId);
    if (connection) {
      await ConnectionLedger.create({
        type: "UPDATED",
        initiatorId: connection.createdBy,
        userA: connection.userA,
        userB: connection.userB,
        connectionId: connection._id,
        microCircleId: connection.microCircleId,
        metadata: {
          timestamp: new Date(),
          source: "change_stream",
          action: "auto_logged",
          updatedFields: updateDescription.updatedFields,
          removedFields: updateDescription.removedFields,
        },
      });
    }
  }

  private async createInitialHostConnection(user: any) {
    if (user.hostId && user.UserRole !== "host") {
      // Check if connection already exists
      const existingConnection = await Connection.findOne({
        $or: [
          { userA: user.hostId, userB: user._id },
          { userA: user._id, userB: user.hostId },
        ],
      });

      if (!existingConnection) {
        const connection = new Connection({
          userA: user.hostId,
          userB: user._id,
          createdBy: user.hostId,
          notes: "Auto-created host connection",
        });

        await connection.save();
        console.log(
          `Auto-created connection between host and new user: ${user.username}`
        );
      }
    }
  }

  public stopMonitoring() {
    if (this.connectionChangeStream) {
      this.connectionChangeStream.close();
      this.connectionChangeStream = null;
    }
    if (this.userChangeStream) {
      this.userChangeStream.close();
      this.userChangeStream = null;
    }
    console.log("Change streams stopped");
  }
}

export const startChangeStreams = () => {
  if (mongoose.connection.readyState !== 1) {
    console.warn(
      "MongoDB not connected. Retrying change streams in 5 seconds..."
    );
    setTimeout(startChangeStreams, 5000);
    return;
  }

  try {
    const changeStreamService = ChangeStreamService.getInstance();
    changeStreamService.startMonitoring();
  } catch (error) {
    console.error("❌ Failed to start change streams:", error);
    setTimeout(startChangeStreams, 10000);
  }
};
