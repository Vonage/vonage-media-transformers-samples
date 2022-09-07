varying vec2 _texture_coord;

attribute vec2 position;
 
void main() {
   gl_Position = vec4(position, 0., 1.);
   _texture_coord = ((position + 1.) / 2.);
   _texture_coord.y = 1. - _texture_coord.y;
}
