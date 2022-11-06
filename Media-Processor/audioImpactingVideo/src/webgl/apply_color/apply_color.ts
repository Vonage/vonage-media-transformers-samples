import * as twgl from "twgl.js";
import { GpuBuffer } from "@mediapipe/selfie_segmentation";
import { vec4 } from "../../types";
import fragmentShader from "./apply_color.frag";
import vertexShader from "./apply_color.vert";

export class ApplyColor {
    public readonly canvas: OffscreenCanvas;
    private readonly context: WebGLRenderingContext;
    private programInfo: twgl.ProgramInfo;
    private bufferInfo: twgl.BufferInfo;

    constructor(canvas: OffscreenCanvas) {
        this.canvas = canvas;
        this.context = this.canvas.getContext("webgl") as WebGLRenderingContext;
        this.programInfo = twgl.createProgramInfo(this.context, [vertexShader, fragmentShader]);
        this.bufferInfo = twgl.createBufferInfoFromArrays(this.context, {
            position: {
                numComponents: 2,
                data: [-1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, -1],
            },
        });
    }

    public run(image: GpuBuffer, mask: GpuBuffer, color: vec4) {
        this.context.viewport(0, 0, this.context.canvas.width, this.context.canvas.height);
        const textures = twgl.createTextures(this.context, {
            image: { src: image },
            mask: { src: mask },
        });

        const uniforms = {
            color,
            image: textures.image,
            mask: textures.mask,
        };

        this.context.useProgram(this.programInfo.program);
        twgl.setBuffersAndAttributes(this.context, this.programInfo, this.bufferInfo);
        twgl.setUniforms(this.programInfo, uniforms);
        twgl.drawBufferInfo(this.context, this.bufferInfo);
    }
}
