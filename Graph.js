class Graph {

    constructor(x, y) {
        this.minX = min(x);
        this.maxX = max(x);
        this.minY = min(y);
        this.maxY = max(y);

        this.margin = 50;

        background(0);

        //Draw points.  
        noFill();
        stroke(255);
        beginShape();
        for (let i = 0; i < x.length; i++) {
            vertex(this.mapX(x[i]), this.mapY(y[i]));
        }
        endShape();

        //Draw Axes.
        stroke(255, 0, 255);
        line(0, this.mapY(0), width, this.mapY(0));//x axis
        line(this.mapX(0), height, this.mapX(0), 0);//y axis

        //Annotate axes.
        text("M", width - 20, this.mapY(0));
        text("N", this.mapX(0), 20);


        //Draw e limit.
        stroke(255, 255, 0);
        drawingContext.setLineDash([2, 10]);
        line(this.mapX(0), this.mapY(0), this.mapX(this.maxX), this.mapX(100) / section.e_min);
        //Annotate e limit
        fill(255, 255, 0);
        noStroke();
        text("e_limit", this.mapX(this.maxX), this.mapX(100) / section.e_min);

        //Draw N limit.
        stroke(0, 100, 255);
        drawingContext.setLineDash([15, 10]);
        line(this.mapX(0), this.mapY(section.N_limit), this.mapX(this.maxX), this.mapY(section.N_limit));
        //Annotate N limit
        fill(0, 100, 255);
        noStroke();
        text("N_limit", this.mapX(this.maxX), this.mapY(section.N_limit));
        drawingContext.setLineDash([]); //reset

        this.drawSection();
    }

    drawSection() {

        push();
        translate(1170, 400);
        scale(section.b/300);
        noFill();
        strokeWeight(2);
        stroke(255, 150, 0);
        rectMode(CENTER);
        rect(0, 0, section.b, section.h);
        for (let reinf of section.reinfs) {
            let a = (section.b - 2 * section.cover) / (reinf.n - 1);
            if (reinf.n != 1) {
                for (let i = 0; i < reinf.n; i++) {
                    ellipse(section.cover - section.b / 2 + a * i, reinf.y - section.h / 2, reinf.D);
                }
            } else {
                ellipse(0, reinf.y - section.h / 2, reinf.D);
            }
        }

        textAlign(CENTER, CENTER);
        for (let reinf of section.reinfs) {
            text(reinf.n + "phi" + reinf.D, 0, reinf.y - section.h / 2 - 2 * reinf.D * Math.sign(reinf.y - section.h / 2));
        }

        text("GC", -40 - section.b / 2, - 5);
        line(-50 - section.b / 2, 0, section.b / 2 + 50, 0);
        if (section.h / 2 != round(section.PC)) {
            text("PC", -40 - section.b / 2, section.PC - section.h / 2 - 5);
            line(-50 - section.b / 2, section.PC - section.h / 2, section.b / 2 + 50, section.PC - section.h / 2);
        }
        pop();
    }

    checkMN() {
        let x = this.mapX(float(checkM.value()));
        let y = this.mapY(float(checkN.value()));
        fill(255);
        text(" M: "+checkM.value() +" , "+"N: "+checkN.value(), x, y);
        ellipse(x, y, 5, 5);
    }

    mapX(x) { return map(x, this.minX, this.maxX, this.margin, height - this.margin); }
    mapY(y) { return map(y, this.minY, this.maxY, height - this.margin, this.margin); }



}