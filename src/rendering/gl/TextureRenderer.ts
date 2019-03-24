import {mat4, vec4, mat3} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram from './ShaderProgram';

export default class TextureRenderer {
    texture: any;  
    framebuffer: any;

    constructor(public canvas: HTMLCanvasElement) {
    }

    setClearColor(r: number, g: number, b: number, a: number) {
      gl.clearColor(r, g, b, a);
    }
  
    setSize(width: number, height: number) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  
    clear() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    render(camera: Camera, prog: ShaderProgram, drawables: Array<Drawable>) {
      let model = mat4.create();
      let viewProj = mat4.create();
      let color = vec4.fromValues(1, 0, 0, 1);
      // Each column of the axes matrix is an axis. Right, Up, Forward.
      let axes = mat3.fromValues(camera.right[0], camera.right[1], camera.right[2],
                                 camera.up[0], camera.up[1], camera.up[2],
                                 camera.forward[0], camera.forward[1], camera.forward[2]);
  
  
      prog.setEyeRefUp(camera.controls.eye, camera.controls.center, camera.controls.up);
      mat4.identity(model);
      mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
      prog.setModelMatrix(model);
      prog.setViewProjMatrix(viewProj);
      prog.setCameraAxes(axes);
  
      for (let drawable of drawables) {
        prog.draw(drawable);
      }
    }

    createTexture() {
        // Create a texture.
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
                    format, type, null);
        
        // set the filtering 
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Create and bind the framebuffer
        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        
        // attach the texture as the first color attachment
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.texture, level);
    }

    renderTexture(camera: Camera, prog: ShaderProgram, drawables: Array<Drawable>) {
        this.createTexture();

        // render to our targetTexture by binding the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
        // render cube with our 3x2 texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
        // Clear the canvas AND the depth buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.render(camera, prog, drawables);

        let ret = new Uint8Array(this.canvas.width * this.canvas.height * 4);
        gl.readPixels(0,0,this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, ret);
        gl.deleteFramebuffer(this.framebuffer);
        return ret;
    }
    
}