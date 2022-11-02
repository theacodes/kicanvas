class Transform {
    constructor(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.flip_x = flip_x;
        this.flip_y = flip_y;
    }

    copy() {
        return new Transform(this.x, this.y, this.rotation, this.flip_x, this.flip_y);
    }

    apply(ctx) {
        ctx.translate(this.x, this.y);
        ctx.scale(this.flip_x ? -1 : 1, this.flip_y ? -1 : 1);
        ctx.rotate((this.rotation * Math.PI) / 180);
    }

    transform_point(x, y) {
        const p = this.mat.transformPoint(new DOMPoint(x, y));
        return {x: p.x, y: p.y};
    }

    normalize_rotation() {
        while(this.rotation > 360) {
            this.rotation -= 360;
        }
        while(this.rotation < 0) {
            this.rotation += 360;
        }
    }

    get mat() {
        const mat = new DOMMatrix();
        mat.translateSelf(this.x, this.y);
        mat.scaleSelf(this.flip_x ? -1 : 1, this.flip_y ? -1 : 1);
        mat.rotateSelf(this.rotation);
        return mat;
    }
}

export class TransformStack {
    constructor(ctx) {
        this.ctx = ctx;
        this.base_matrix = ctx.getTransform();
        this.t_stack = [];
        this.m_stack = [];
    }

    push(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        const tx = new Transform(x, y, rotation, flip_x, flip_y);
        this.m_stack.push(this.ctx.getTransform());
        this.t_stack.push(tx);
        tx.apply(this.ctx);
    }

    pop() {
        this.t_stack.pop();
        this.ctx.setTransform(this.m_stack.pop());
    }

    get abs() {
        if (this.t_stack.length == 0) {
            return new Transform();
        }
        const atx = this.t_stack[0].copy();
        for (const tx of this.t_stack.slice(1)) {
            atx.rotation += tx.rotation;
            if (tx.flip_x) {
                atx.flip_x = !atx.flip_x;
            }
            if (tx.flip_y) {
                atx.flip_y = !atx.flip_y;
            }
        }
        return atx;
    }

    get mat() {
        const mat = new DOMMatrix();
        for (const tx of this.t_stack) {
            mat.multiplySelf(tx.mat);
        }
        return mat;
    }
}
