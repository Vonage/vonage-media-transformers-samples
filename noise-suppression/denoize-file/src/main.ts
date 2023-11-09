import { Pipeline, PipelineOptions } from "./pipeline";
import { Source } from "./source";

const $ = document.querySelector.bind(document);

async function main() {
    if (!isSupported()) {
        ($("#step-unsupported") as any)!.style.display = "block";
        return;
    }

    const $step1 = $("#step-1") as HTMLDivElement;
    const $step2 = $("#step-2") as HTMLDivElement;
    const $step3 = $("#step-3") as HTMLDivElement;

    const $inputFile = $("#input-file") as HTMLInputElement;
    const $progress = $("#progress") as any;
    const $audioPlayer = $("#audio-player") as any;
    const $latency = $("#latency") as any;
    const $downloadProcessed = $("#download-processed") as HTMLButtonElement;
    const $restart = $("#restart") as HTMLButtonElement;
    const $switchMultithread = $("#switch-multithread") as any;

    show($step1);
    $inputFile.onchange = () => {
        hide($step1);
        show($step2);
        if (!$inputFile.files || $inputFile.files.length === 0) {
            alert("Missing input file");
            throw "Missing input file";
        }

        const file: File = $inputFile.files[0];
        if (!["audio/wav", "audio/x-wav"].includes(file.type)) {
            alert("Wrong file type. Please, select a wav file");
            throw "Wrong file type. Please, select a wav file";
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result;
                if (!dataUrl) {
                    alert("Failed to read file");
                    throw "Failed to read file";
                }
                const fileNameParts = file.name.split(".");
                fileNameParts[fileNameParts.length - 2] += "-processed";
                const fileName = fileNameParts.join(".");
                const source = await Source.dataUrl(dataUrl as string);
                const { stream } = source;

                const result = await createPipeline(stream, {
                    disableWasmMultiThread: !$switchMultithread.checked,
                });

                source.addEventListener("timeupdate", (e: any) => {
                    $progress.progress = e.timestamp / source.duration;
                });

                source.addEventListener("ended", async (e: any) => {
                    hide($step2);

                    const wav = result.pipeline.getWav();
                    $audioPlayer.src = wav;
                    $downloadProcessed.onclick = () => {
                        const link = document.createElement("a");
                        link.href = wav;
                        link.download = fileName;
                        link.target = "_blank";
                        link.click();
                    };
                    $latency.innerHTML = (await result.pipeline.getLatency()) + "ns";
                    show($step3);
                });

                source.play();
            } catch (e) {
                alert("Error while processing file : " + reader.error);
                throw "Error while processing file : " + reader.error;
            }
        };
        reader.onerror = (e) => {
            alert("Reader error : " + reader.error);
            throw "Reader error : " + reader.error;
        };
        reader.readAsDataURL(file);
    };

    $restart.onclick = () => window.location.reload();

    bindButtonToLink(
        "githubButton",
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/noise-suppression/process-file"
    );
    bindButtonToLink("npmButton", "https://www.npmjs.com/package/@vonage/noise-suppression");

    bindButtonToLink(
        "vividButton",
        "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid"
    );
}

window.onload = () => main();

async function createPipeline(inputStream: MediaStream, options: PipelineOptions) {
    const pipeline = await Pipeline.create(inputStream.getAudioTracks()[0], options);
    return { pipeline };
}

function show(el: HTMLElement) {
    el.style.display = "block";
}

function hide(el: HTMLElement) {
    el.style.display = "none";
}

function bindButtonToLink(id: string, link: string) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener("click", () => {
            window.open(link, "_blank")?.focus();
        });
    }
}

function isSupported(): boolean {
    const audio = document.createElement("audio") as any;
    return audio.captureStream !== undefined;
}
