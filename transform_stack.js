class Transform {
    constructor(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.flip_x = flip_x;
        this.flip_y = flip_y;
    }

    apply(ctx) {
        ctx.translate(this.x, this.y);
        ctx.scale(this.flip_x ? -1 : 1, this.flip_y ? -1 : 1);
        ctx.rotate((this.rotation * Math.PI) / 180);
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
        const atx = new Transform();
        for (const tx of this.t_stack) {
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
}
