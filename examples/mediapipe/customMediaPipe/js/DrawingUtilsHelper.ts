import {drawRectangle, drawConnectors, drawLandmarks, lerp, clamp} from '@mediapipe/drawing_utils'

declare global{
    var drawRectangle: Function
    var drawConnectors: Function
    var drawLandmarks: Function
    var lerp: Function
    var clamp: Function
}

if(!globalThis.drawRectangle){
    globalThis.drawRectangle = drawRectangle
}

if(!globalThis.drawConnectors){
    globalThis.drawConnectors = drawConnectors
}

if(!globalThis.drawLandmarks){
    globalThis.drawLandmarks = drawLandmarks
}

if(!globalThis.lerp){
    globalThis.lerp = lerp
}

if(!globalThis.clamp){
    globalThis.clamp = clamp
}