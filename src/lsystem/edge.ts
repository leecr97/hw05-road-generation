import { vec2, vec3, mat4, quat } from "gl-matrix";

export default class Edge {
    leftPt: vec3;
    rightPt: vec3;
    isHighway: boolean;
    xoffset: number = 850;
    yoffset: number = 530;

    constructor(p1: vec2, p2: vec2, isHighway: boolean) {
        let p1o: vec3 = vec3.fromValues(p1[0] - this.xoffset, p1[1] - this.yoffset, 0);
        let p2o: vec3 = vec3.fromValues(p2[0] - this.xoffset, p2[1] - this.yoffset, 0);
        
        if (vec3.distance(vec3.fromValues(-this.xoffset,-this.yoffset,0), p1o) 
            > vec3.distance(vec3.fromValues(-this.xoffset,-this.yoffset,0), p2o)) {
            this.leftPt = p1o;
            this.rightPt = p2o;
        }
        else {
            this.leftPt = p2o;
            this.rightPt = p1o;
        }
        this.isHighway = isHighway;
    }

    getLeftPoint() {
        return vec2.fromValues(this.leftPt[0] + this.xoffset, this.leftPt[1] + this.yoffset);
    }

    getRightPoint() {
        return vec2.fromValues(this.rightPt[0] + this.xoffset, this.rightPt[1] + 530);
    }

    findAngle(v1: vec3, v2: vec3) : number {
        let l1: number = vec3.length(v1);
        let l2: number = vec3.length(v2);
        let dot: number = vec3.dot(v1, v2);

        return Math.acos(dot / (l1 * l2));
    }

    getTransformation(): mat4 {        
        // console.log("p1: " + leftPt[0] + ", " + leftPt[1]);
        // console.log("p2: " + rightPt[0] + ", " + rightPt[1]);

        // calculate translate - midpoint of edge
        let midx = (this.leftPt[0] + this.rightPt[0]) / 2;
        let midy = (this.leftPt[1] + this.rightPt[1]) / 2;
        let midz = (this.leftPt[2] + this.rightPt[2]) / 2;
        let translate: vec3 = vec3.fromValues(midx, midy, midz);
        // translate = this.p1;
        let t: mat4 = mat4.create();
        mat4.fromTranslation(t, translate);

        // calculate rotate - quat of angle from y-axis
        let axis: vec3 = vec3.fromValues(0,0,1);
        let direction: vec3 = vec3.create();
        vec3.subtract(direction, this.rightPt, this.leftPt);
        let angle: number = this.findAngle(vec3.fromValues(0,1,0), direction);
        // angle = angle * Math.PI / 180.0;
        // let angleDeg: number = angle * (180.0 / Math.PI);
        // console.log("ang: " + angleDeg);

        let rotation: quat = quat.create();
        quat.setAxisAngle(rotation, axis, angle);
        let r: mat4 = mat4.create();
        mat4.fromQuat(r, rotation);
        
        // scale
        let scaleX: number = this.isHighway ? 10 : 3;
        let scale: vec3 = vec3.fromValues(scaleX, vec3.length(direction), 1);
        let s: mat4 = mat4.create();
        mat4.fromScaling(s, scale);

        let transform: mat4 = mat4.create();
        mat4.fromRotationTranslationScale(transform, rotation, translate, scale);
        // mat4.multiply(transform, r, s);
        // mat4.multiply(transform, t, transform)
	    return transform;
    }
}