precision mediump float;
 
varying vec2 _texture_coord;

uniform vec4 color;
uniform sampler2D image;
uniform sampler2D mask;

void main() {
    vec4 imageColor = texture2D(image,_texture_coord);
    vec4 maskColor = texture2D(mask,_texture_coord);
    float factor = color.a * maskColor.r;
    gl_FragColor = imageColor * (1. - factor) + color * factor;
}