import * as OpenTok from "@opentok/client";
import { MediaProcessorConnector } from "@vonage/media-processor";
import { Nullable } from "../types";

export class OpenTokFacade {
    private session?: OpenTok.Session;
    private connectPromise?: Promise<boolean>;
    private publisher?: OT.Publisher;

    private publisherVideo: HTMLVideoElement = document.createElement("video");

    constructor(public readonly incoming?: HTMLElement) {}

    public async connect(apiKey: string, sessionId: string, token: string): Promise<Boolean> {
        if (!this.connectPromise) {
            this.connectPromise = new Promise(async (resolve) => {
                this.session = OpenTok.initSession(apiKey, sessionId);

                this.session.on("streamCreated", ({ stream }) => {
                    this.handleStreamCreated(stream);
                });
                this.session.on("sessionDisconnected", ({ reason }) => {
                    this.handleSessionDisconnected(reason);
                });
                this.session.connect(token, async (error) => {
                    error
                        ? this.handleSessionConnectError(error)
                        : await this.handleSessionConnect();

                    resolve(error === undefined);
                });
            });
        }
        return this.connectPromise;
    }
    public async disconnect(): Promise<void> {
        if (this.connectPromise) {
            await this.connectPromise;
            this.session?.disconnect();
            this.connectPromise = undefined;
        }
    }

    public setVideoMediaProcessorConnector(video: Nullable<MediaProcessorConnector> = null) {
        this.publisher?.setVideoMediaProcessorConnector(video);
    }

    private async initPublisher() {
        return new Promise((resolve) => {
            this.publisher = OpenTok.initPublisher(
                this.publisherVideo,
                {
                    insertMode: "append",
                    width: "100%",
                    height: "100%",
                },
                (error?: OpenTok.OTError) => {
                    if (error) {
                        throw error;
                    }
                    resolve(undefined);
                }
            );
            this.session?.publish(this.publisher, (error?: OpenTok.OTError) => {
                if (error) {
                    throw error;
                }
            });
        });
    }

    private async initSubscriber(stream: OpenTok.Stream) {
        this.session?.subscribe(
            stream,
            this.incoming,
            {
                insertMode: "append",
                width: "100%",
                height: "100%",
            },
            () => {}
        );
    }

    private handleStreamCreated(stream: OpenTok.Stream) {
        console.log("Stream created");
        this.initSubscriber(stream);
    }

    private handleSessionConnect() {
        console.log("Session connected");
        return this.initPublisher();
    }

    private handleSessionConnectError(error: OpenTok.OTError) {
        console.log("An error happens while connecting session.", error);
    }

    private handleSessionDisconnected(reason: string) {
        console.log("You were disconnected from the session.", reason);
    }
}
