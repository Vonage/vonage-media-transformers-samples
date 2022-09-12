import * as OpenTok from "@opentok/client";
import { Source } from "../source";

export class OpenTokFacade {
    private session?: OpenTok.Session;
    private connectPromise?: Promise<boolean>;
    private publisher?: OT.Publisher;

    private publisherVideo: HTMLVideoElement = document.createElement("video");

    constructor(public upcoming: Source, public readonly incoming?: HTMLElement) {}

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
                this.session.connect(token, (error) => {
                    resolve(!!error);
                    error ? this.handleSessionConnectError(error) : this.handleSessionConnect();
                });
            });
        }
        return this.connectPromise;
    }

    public setUpcomingSource(source: Source) {
        this.upcoming = source;
        this.publisher?.setAudioSource(source.audioTrack);
        // this.publisher?.setVideoSource(source.videoTrack); //Not possible atm
    }

    private initPublisher() {
        this.publisher = OpenTok.initPublisher(
            this.publisherVideo,
            {
                insertMode: "append",
                width: "100%",
                height: "100%",
                videoSource: this.upcoming.videoTrack,
                audioSource: this.upcoming.audioTrack,
            },
            (error?: OpenTok.OTError) => {
                if (error) {
                    throw error;
                }
            }
        );
        this.session?.publish(this.publisher, (error?: OpenTok.OTError) => {
            if (error) {
                throw error;
            }
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
        this.initPublisher();
    }

    private handleSessionConnectError(error: OpenTok.OTError) {
        console.log("An error happens while connecting session.", error);
    }

    private handleSessionDisconnected(reason: string) {
        console.log("You were disconnected from the session.", reason);
    }
}
