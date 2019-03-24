export default class TextureReader {
    textureData: Uint8Array;
    width: number;
    height: number;

    constructor(td: Uint8Array, w: number, h: number) {
        this.textureData = td;
        this.width = w;
        this.height = h;
        // console.log("dim: " + this.width + ", " + this.height);
    }

    boundsCheck(x: number, y: number) : boolean {
        // console.log("pos: " + x + ", " + y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        else {
            return true;
        }
    }

    clampToBounds(x: number, y: number) {
        if (x < 0) {
            x = 0;
        }
        if (x >= this.width) {
            x = this.width - 1;
        }
        if (y < 0) {
            y = 0;
        }
        if (y >= this.height) {
            y = this.height - 1;
        }
    }

    getData(x: number, y: number) : number {
        // console.log("pos: " + x + ", " + y);
        if (!this.boundsCheck(x,y)) {
            // console.log("quoi?");
            return -1.0;
        }
        
        let indX = Math.floor(x);
        let indY = Math.floor(y);
        let index: number = indX * 4 + indY * this.width * 4;
        return this.textureData[index] / 255;
    }
}