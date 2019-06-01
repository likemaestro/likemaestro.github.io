
class Reinforcement {

    constructor(n, D, fyk, y) {
        this.n = n;
        this.D = D;
        this.fyk = fyk;
        this.fyd = fyk/1.15;
        this.y = y;
        this.A = PI * sq(D/2);
        this.As = n * this.A;
    }
}