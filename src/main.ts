import {vec2, vec3, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import TextureRenderer from './rendering/gl/TextureRenderer';
import TextureReader from './lsystem/texturereader';
import LSystem from './lsystem/lsystem';
import Edge from './lsystem/edge';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  Map: 0,
  PopulationThreshold: 0.45,
  MaxNumBranches: 4,
  GridSize: 50,
};

let square: Square;
let screenQuad: ScreenQuad;
let time: number = 0.0;

let map: number = 0;
let popThres: number = 0.45;
let maxBranch: number = 4;
let gsize: number = 50;

function loadScreenQuad() {
  screenQuad = new ScreenQuad();
  screenQuad.create();
}

function loadScene(lsys: LSystem) {
  square = new Square();
  square.create();

  lsys.createCity();

  // Set up instanced rendering data arrays here.
  let edgeData: Edge[] = lsys.edgeData;
  let isectData: vec3[] = lsys.isectData;

  let colorsArray : number[] = [];
  let col1Array : number[] = [];
  let col2Array : number[] = [];
  let col3Array : number[] = [];
  let col4Array : number[] = [];

  console.log("e: " + edgeData.length);

  for (let i: number = 0; i < edgeData.length; i++) {
    let e: Edge = edgeData[i];
    // console.log("p1: " + e.p1[0] + ", " + e.p1[1]);
    // console.log("p2: " + e.p2[0] + ", " + e.p2[1]);
    let t: mat4 = e.getTransformation();
    // console.log(t);

    // column data
    col1Array.push(t[0]);
    col1Array.push(t[1]);
    col1Array.push(t[2]);
    col1Array.push(t[3]);

    col2Array.push(t[4]);
    col2Array.push(t[5]);
    col2Array.push(t[6]);
    col2Array.push(t[7]);

    col3Array.push(t[8]);
    col3Array.push(t[9]);
    col3Array.push(t[10]);
    col3Array.push(t[11]);

    col4Array.push(t[12]);
    col4Array.push(t[13]);
    col4Array.push(t[14]);
    col4Array.push(t[15]);

    // color data
    colorsArray.push(1);
    colorsArray.push(1);
    colorsArray.push(1);
    colorsArray.push(1);
  }
  let colors : Float32Array = new Float32Array(colorsArray);
  let col1 : Float32Array = new Float32Array(col1Array);
  let col2 : Float32Array = new Float32Array(col2Array);
  let col3 : Float32Array = new Float32Array(col3Array);
  let col4 : Float32Array = new Float32Array(col4Array);
  square.setInstanceVBOs(colors, col1, col2, col3, col4);
  square.setNumInstances(edgeData.length); 
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'Map', { Terrain: 0, 'Land and Water': 1, 'Population Density': 2, Combined: 3} );
  gui.add(controls, 'PopulationThreshold', 0, 1.0);
  gui.add(controls, 'MaxNumBranches', 1, 5);
  gui.add(controls, 'GridSize', 10, 100);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScreenQuad();

  // const camera = new Camera(vec3.fromValues(10, 10, 10), vec3.fromValues(0, 0, 0));
  const camera = new Camera(vec3.fromValues(0, 0, 800), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const texture = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  // render textures
  const tcanvas = <HTMLCanvasElement> document.getElementById('texturecanvas');
  const textureRenderer = new TextureRenderer(tcanvas);
  textureRenderer.setClearColor(0,0,1,1);
  textureRenderer.setSize(2000, 1000);
  
  // get height data
  texture.setMap(0);
  let heightData: Uint8Array = textureRenderer.renderTexture(camera, texture, [screenQuad]);
  let heightTexture: TextureReader = new TextureReader(heightData, 2000, 1000);

  // get land and water data
  texture.setMap(1);
  let landWaterData: Uint8Array = textureRenderer.renderTexture(camera, texture, [screenQuad]);
  let landWaterTexture: TextureReader = new TextureReader(landWaterData, 2000, 1000);

  // get population density data
  texture.setMap(2);
  let populationData: Uint8Array = textureRenderer.renderTexture(camera, texture, [screenQuad]);
  let populationTexture: TextureReader = new TextureReader(populationData, 2000, 1000);

  let lsystem: LSystem = new LSystem(heightTexture, landWaterTexture, populationTexture);

  // Initial call to load scene
  loadScene(lsystem);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    if (map != controls.Map) {
      map = controls.Map;
      flat.setMap(map);
    }
    if (popThres != controls.PopulationThreshold) {
      popThres = controls.PopulationThreshold;
      lsystem.reset();
      lsystem.setPopulationThreshold(popThres);
      loadScene(lsystem);
    }
    if (maxBranch != controls.MaxNumBranches) {
      maxBranch = controls.MaxNumBranches;
      lsystem.reset();
      lsystem.setNumRays(maxBranch);
      loadScene(lsystem);
    }
    if (gsize != controls.GridSize) {
      gsize = controls.GridSize;
      lsystem.reset();
      lsystem.setGridSize(gsize);
      loadScene(lsystem);
    }

    renderer.clear();
    renderer.render(camera, flat, [screenQuad]);
    renderer.render(camera, instancedShader, [
      square,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    // textureRenderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    flat.setDimensions(window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  // textureRenderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  flat.setDimensions(window.innerWidth, window.innerHeight);
  
  // Start the render loop
  tick();
}

main();
