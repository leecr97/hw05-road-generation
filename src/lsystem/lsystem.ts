import {vec2, vec3, mat4, quat} from 'gl-matrix';
import Turtle from "./Turtle";
import Edge from "./Edge"
import TextureReader from "./texturereader";
import { request } from 'http';

export default class LSystem {
    // expansionRule: ExpansionRule;
    // currTurtle: Turtle;
    // turtleStack: Turtle[];
    edgeData: Edge[] = [];
    isectData: vec3[] = [];
    heightData: TextureReader;
    landWaterData: TextureReader;
    populationData: TextureReader;
    highways: Edge[] = [];
    highwayLength: number = 400;
    roadSegLength: number = 50;
    segsPerHway: number;
    roadIsects: vec2[] = [];
    populationThreshold: number = 0.45;
    numRays: number = 4;

    constructor(height: TextureReader, water: TextureReader, popul: TextureReader) {
        this.heightData = height;
        this.landWaterData = water;
        this.populationData = popul;
        this.segsPerHway = Math.floor(this.highwayLength / this.roadSegLength);
    }

    reset() {
        this.edgeData = [];
        this.isectData = [];
        this.highways = [];
        this.roadIsects = [];
        this.populationThreshold = 0.45;
        this.numRays = 4;
        this.roadSegLength = 50;
        this.segsPerHway = Math.floor(this.highwayLength / this.roadSegLength);
    }

    setPopulationThreshold(pt: number) {
        this.populationThreshold = pt;
    }
    setNumRays(r: number) {
        this.numRays = r;
    }
    setGridSize(g: number) {
        this.roadSegLength = g;
        this.segsPerHway = Math.floor(this.highwayLength / this.roadSegLength);
    }

    createCity() {
        // draw roads depending on rules

        // first draw highways
        
        this.generateHighways();

        // then draw smaller roads
        this.generateRoads();
    }

    getRandomAngle(seed: number) {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // highways use basic road expansion
    generateHighways() {
        let turtleStack: Turtle[] = [];
        let initPos: vec2 = vec2.fromValues(-10, 100);
        let forwPlaceholder: vec2 = vec2.fromValues(0,0);

        let hTurtle1 = new Turtle(initPos, forwPlaceholder, 0);
        turtleStack.push(hTurtle1);

        // the main roads follow population density as a metric for directional bias

        let currPos: vec2 = vec2.create();

        while (turtleStack.length > 0) {
            let currTurtle: Turtle = turtleStack.shift();
            currPos = currTurtle.position;
            // console.log("currp: " + currPos[0] + ", " + currPos[1]);

            let branches: Turtle[] = [];
            // let highestDensity: number = -1.0;
            let defaultTarget: vec2 = vec2.fromValues(0,0);
            let found: boolean = false;
            let counter: number = 0;

            let seed: number = 32711.67175;
            // shoot out number of random rays, find points that have over a certain population threshold
            for (let i: number = 0; i < this.numRays; i++) {
                seed += (i * 3979.55062 + 8289.17);
                let rand: number = this.getRandomAngle(seed);
                let randAngle : number = Math.floor(rand * 181.0) - 90;
                if (i == 0) {
                    randAngle = Math.abs(randAngle);
                }
                // console.log(randAngle);
                randAngle = randAngle * Math.PI / 180.0;

                let randX: number = currPos[0] + this.highwayLength * Math.cos(randAngle);
                let randY: number = currPos[1] + this.highwayLength * Math.sin(randAngle);
                let newPoint: vec2 = vec2.fromValues(randX, randY);
                // console.log("newp: " + newPoint[0] + ", " + newPoint[1]);

                let currDensity: number = this.populationData.getData(newPoint[0], newPoint[1]);
                // console.log("den: " + currDensity);
                if (i == 0) {
                    defaultTarget = newPoint;
                }
                if (currDensity > -1.0 && currDensity > this.populationThreshold && counter < 2) {
                    // console.log("den: " + currDensity);
                    let newEdge: Edge = new Edge(currPos, newPoint, true);
                    this.edgeData.push(newEdge);
                    this.highways.push(newEdge);

                    let newIsect: vec2 = newPoint;
                    this.isectData.push(vec3.fromValues(newIsect[0], 0, newIsect[1]));

                    let newTurtle: Turtle = new Turtle(newPoint, forwPlaceholder, 0);
                    branches.push(newTurtle);

                    found = true;
                    counter++;
                }
            }

            // if (found) {
                
            // }
            if (!found) {
                // console.log("targ: " + target[0] + ", " + target[1]);
                let valid: boolean = this.populationData.boundsCheck(defaultTarget[0], defaultTarget[1]);
                if (valid) {
                    let newEdge: Edge = new Edge(currPos, defaultTarget, true);
                    this.edgeData.push(newEdge);
                    this.highways.push(newEdge);

                    let newIsect: vec2 = defaultTarget;
                    this.isectData.push(vec3.fromValues(newIsect[0], newIsect[1], 0));

                    let newTurtle: Turtle = new Turtle(defaultTarget, forwPlaceholder, 0);
                    branches.push(newTurtle);
                }
                else {
                    if (defaultTarget[0] < 0) {
                        defaultTarget[0] = 0;
                    }
                    if (defaultTarget[0] >= this.populationData.width) {
                        defaultTarget[0] = this.populationData.width - 1;
                    }
                    if (defaultTarget[1] < 0) {
                        defaultTarget[1] = 0;
                    }
                    if (defaultTarget[1] >= this.populationData.height) {
                        defaultTarget[1] = this.populationData.height - 1;
                    }
                    let newEdge: Edge = new Edge(currPos, defaultTarget, true);
                    this.edgeData.push(newEdge);
                    this.highways.push(newEdge);

                    let newIsect: vec2 = defaultTarget;
                    this.isectData.push(vec3.fromValues(newIsect[0], newIsect[1], 0));
                }
            }

            for (let i: number = 0; i < branches.length; i++) {
                turtleStack.push(branches[i]);
            }
            branches = [];
        }
    }

    onLand(pos: vec2): boolean {
        let land: number = this.landWaterData.getData(pos[0], pos[1]);
        // console.log("land: " + land);
        if (land > 0.26) {
            return true;
        }
        else return false;
    }

    isTurtleValid(t: Turtle): boolean {
        // water check
        let onland: boolean = this.onLand(t.position);

        // recursion limit check
        let hitRecursionLimit: boolean = (t.recursionDepth >= this.segsPerHway) ? true: false;

        // let valid: boolean = !onwater;
        let valid: boolean = (onland && !hitRecursionLimit);

        return valid;
    }

    turtleIntersect(t: Turtle) : boolean {
        // intersection check
        let radius: number = 20;
        let intersect: boolean = false;
        for (let i: number = 0; i < this.roadIsects.length; i++) {
            let is: vec2 = this.roadIsects[i];
            let d: number = vec2.distance(is, t.position);
            if (d < radius) {
                t.position = is;
                return true;
            }
        }
        return intersect;
    }

    // smaller roads use checkered road expansion
    generateRoads() {
        // the roads are aligned with some global directional vector and have a maximum block width and length.
        // intersections are all roughly 90 degrees.
        let turtleStack: Turtle[] = [];

        // create turtles along highways and push them onto turtle stack
        while (this.highways.length > 0) {
            let currEdge: Edge = this.highways.shift();
            let currPos: vec2 = currEdge.getLeftPoint();
            let currDir: vec2 = vec2.create();
            vec2.subtract(currDir, currEdge.getRightPoint(), currEdge.getLeftPoint());

            let rTurtle1 = new Turtle(currPos, currDir, 0);
            turtleStack.push(rTurtle1);

            for (let i: number = 0; i < this.segsPerHway; i++) {
                let newTurtle: Turtle = rTurtle1.createCopy();
                newTurtle.moveForward(this.roadSegLength);
                if (this.isTurtleValid(newTurtle)) {
                    turtleStack.push(newTurtle);
                    rTurtle1.copyTurtle(newTurtle);
                }
                else {
                    break;
                }
            }
        }

        // iterate through turtle stack. 
        // each turtle moves forward roadSeg distance and then creates three more Turtles, 
        // pointing forward, right, and left.
        // turtles can't go on the water. also can't go somewhere a turtle has already been. (how tf do i know that)
        let branches: Edge[] = [];
        while (turtleStack.length > 0) {
            let currTurtle: Turtle = turtleStack.shift();
            if (!this.isTurtleValid(currTurtle)) {
                continue;
            }

            let forwardTurtle: Turtle = currTurtle.createCopy();
            forwardTurtle.moveForward(this.roadSegLength);
            if (this.isTurtleValid(forwardTurtle)) {
                let newEdge: Edge = new Edge(currTurtle.position, forwardTurtle.position, false);
                branches.push(newEdge);

                // if (!this.turtleIntersect(forwardTurtle)) {
                    let newIsect: vec2 = forwardTurtle.position;
                    this.roadIsects.push(newIsect);

                    turtleStack.push(forwardTurtle);
                // }
            }

            let rightTurtle: Turtle = currTurtle.createCopy();
            rightTurtle.rotate2d(90);
            rightTurtle.moveForward(this.roadSegLength);
            if (this.isTurtleValid(rightTurtle)) {
                let newEdge: Edge = new Edge(currTurtle.position, rightTurtle.position, false);
                branches.push(newEdge);

                // if (!this.turtleIntersect(rightTurtle)) {
                    let newIsect: vec2 = rightTurtle.position;
                    this.roadIsects.push(newIsect);

                    turtleStack.push(rightTurtle);
                // }
            }

            let leftTurtle: Turtle = currTurtle.createCopy();
            leftTurtle.rotate2d(270);
            leftTurtle.moveForward(this.roadSegLength);
            if (this.isTurtleValid(leftTurtle)) {
                let newEdge: Edge = new Edge(currTurtle.position, leftTurtle.position, false);
                branches.push(newEdge);

                // if (!this.turtleIntersect(leftTurtle)) {
                    let newIsect: vec2 = leftTurtle.position;
                    this.roadIsects.push(newIsect);

                    turtleStack.push(leftTurtle);
                // }
            }
        }

        for (let i: number = 0; i < branches.length; i++) {
            // console.log("branch");
            // if (branches[i].leftPt[0] != branches[i].rightPt[0]) {
            //     console.log(branches[i].leftPt + ", " + branches[i].rightPt);
            // }
            
            // console.log(this.edgeData.includes(branches[i]));

            this.edgeData.push(branches[i]);
        }

        // put the road isects into isectdata?
    }
}