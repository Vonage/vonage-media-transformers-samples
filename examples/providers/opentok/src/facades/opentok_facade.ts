import * as OpenTok from "@opentok/client";
import { Source } from "../source";
import { Target } from "../target";

export class OpenTokFacade {
    public subscriberStream: MediaStream = new MediaStream();
    public subscriberVideoElement: HTMLVideoElement = document.createElement("video");
    public publisherStream: MediaStream = new MediaStream();
    public publisherVideoElement: HTMLVideoElement = document.createElement("video");
    private session?: OpenTok.Session;
    private connectPromise?: Promise<boolean>;

    public get source(): Source {
        return Source.stream(this.publisherStream);
    }

    public get target(): Target {
        return Target.stream(this.publisherStream);
    }

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

    private initPublisher() {
        const publisher = OpenTok.initPublisher(
            this.publisherVideoElement,
            {
                insertMode: "append",
                width: "100%",
                height: "100%",
            },
            (e) => {
                throw e;
            }
        );
        this.session?.publish(publisher, (e) => {
            throw e;
        });

        const audioTrack = publisher.getAudioSource();
        if (audioTrack) {
            this.publisherStream.addTrack(publisher.getAudioSource());
        }

        const videoSource = publisher.getVideoSource();
        if (videoSource.track) {
            this.publisherStream.addTrack(videoSource.track);
        }
    }

    private initSubscriber() {
        /*
        const subscriber = this.session?.subscribe(
            stream,
            this.subscriberVideoElement,
            {
                insertMode: "append",
                width: "100%",
                height: "100%",
            },
            () => {}
        );
        if (subscriber?.stream) {
            this.initStream(subscriber.stream, this.subscriberStream);
        }
        */
    }

    private handleStreamCreated(stream: OpenTok.Stream) {
        this.initSubscriber();
    }

    private handleSessionConnect() {
        this.initPublisher();
    }

    private handleSessionConnectError(error: OpenTok.OTError) {
        console.log("An error happens while connecting session.", error);
    }

    private handleSessionDisconnected(reason: string) {
        console.log("You were disconnected from the session.", reason);
    }
}
