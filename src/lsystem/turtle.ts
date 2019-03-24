import {vec2, vec3, mat4, quat} from 'gl-matrix';

export default class Turtle {
    position: vec2 = vec2.create(); // because is 2d, z will always be 0
    forward: vec2 = vec2.create();
    // quaternion: quat = quat.create();
    recursionDepth: number; 

  constructor(pos: vec2, forw: vec2, rd: number) {
    this.position = pos;
    this.forward = forw;
    vec2.normalize(this.forward, this.forward);
    this.recursionDepth = rd;
  }

  moveForward(d: number) {
    let dist : vec2 = vec2.create();
    vec2.multiply(dist, this.forward, vec2.fromValues(d, d));
    vec2.add(this.position, this.position, dist);
    // console.log("move forward: " + this.position);
  }

  createCopy(): Turtle {
    let pos: vec2 = vec2.create();
    vec2.copy(pos, this.position);
    let ori: vec2 = vec2.create();
    vec2.copy(ori, this.forward);

    let newT : Turtle = new Turtle(pos, ori, this.recursionDepth + 1);
    return newT;
  }

  copyTurtle(t: Turtle) {
    this.position = t.position;
    this.forward = t.forward;
  }

  rotate2d(deg: number) {
    let axis: vec3 = vec3.fromValues(0,0,1);
    let q: quat = quat.create();
    quat.setAxisAngle(q, axis, deg * Math.PI / 180.0);
    quat.normalize(q,q);

    let rot: vec3 = vec3.fromValues(this.forward[0], this.forward[1], 0);
    rot = vec3.transformQuat(rot, rot, q);
    vec3.normalize(rot, rot);
    // console.log("rot: " + rot[0] + ", " + rot[1] + ", " + rot[2]);

    this.forward = vec2.fromValues(rot[0], rot[1]);
    vec2.normalize(this.forward, this.forward);
    // quat.rotationTo(this.quaternion, vec3.fromValues(0,1,0), this.orientation);
  }
}