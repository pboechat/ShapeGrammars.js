var shapegrammar = shapegrammar || {};

shapegrammar.AxiomTypes = [ "Box", "Quad", "Prism", "Sphere" ];

shapegrammar.interpreter = (function() {

    var Call = function(successor, rules) {
        this.successor = successor;
        this.rules = rules;
    }

    Call.prototype.apply = function(shape) {
        if (!(this.successor in this.rules))
            createTerminal(shape);
        else
            this.rules[this.successor].apply(shape);
    }

    var Scale = function(x, y, z, next) {
        this.x = x; this.y = y; this.z = z; this.next = next;
    }

    Scale.prototype.apply = function(shape) {
        var x = (this.x > 0) ? this.x : shape.size.x * Math.abs(this.x);
        var y = (this.y > 0) ? this.y : shape.size.y * Math.abs(this.y);
        var z = (this.z > 0) ? this.z : shape.size.z * Math.abs(this.z);
        shape.size = new THREE.Vector3(x, y, z);
        this.next.apply(shape);
    }

    var Rotate = function(x, y, z, next) {
        this.x = x; this.y = y; this.z = z; this.next = next;
    }

    Rotate.prototype.apply = function(shape) {
        var transform = new THREE.Matrix4();
        transform.makeRotationFromEuler(new THREE.Vector3(this.x, this.y, this.z));
        shape.model = transform.multiply(shape.model);
        this.next.apply(shape);
    }

    var Translate = function(x, y, z, next) {
        this.x = x; this.y = y; this.z = z; this.next = next;
    }

    Translate.prototype.apply = function(shape) {
        var transform = new THREE.Matrix4();
        transform.makeTranslation(this.x, this.y, this.z);
        shape.model = transform.multiply(shape.model);
        this.next.apply(shape);
    }

    function createTerminal(shape) {
        console.log(shape);
    }

    function visit(successor, rules) {
        if (typeof successor === "string") {
            // symbol
            return new Call(successor, rules);
        } else {
            // shape operation
            /*if (successor.operator == "extrude") {
                return new Extrude();
            } else if (successor.operator == "comp") {
                return new ComponentSplit();
            } else if (successor.operator == "split") {
                return new Split();
            } else*/ if (successor.operator == "s") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 next operation");
                return new Scale(x, y, z, visit(successor.operations[0], rules));
            } else if (successor.operator == "r") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 next operation");
                return new Rotate(x, y, z, visit(successor.operations[0], rules));
            } else if (successor.operator == "t") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 next operation");
                return new Translate(x, y, z, visit(successor.operations[0], rules));
            } else {
                throw new Error("unsupported operator");
            }
        }
    }

    function createShape(axiom) {
        var model = new THREE.Matrix4();
        model.setPosition(axiom.position);
        return { type: axiom.type,
            model: model,
            size: axiom.size
        };
    }

    function interpret(axiom, symbol, parseTree, canvas) {
        if (!("type" in axiom))
            throw new Error("axiom doesn't have type");

        if (!("size" in axiom))
            throw new Error("axiom doesn't have size");

        if (!("position" in axiom))
            throw new Error("axiom doesn't have position");

        var rules = {};
        if (parseTree.constructor === Array) {
            for (var i = 0; i < parseTree.length; i++)
                this.rules[parseTree[i].predecessor] = visit(parseTree[i].successor, rules);
        }
        else
            rules[parseTree.predecessor] = visit(parseTree.successor, rules);
        if (symbol in rules)
            rules[symbol].apply(createShape(axiom));
    }

    return {
        interpret: interpret

    };

})();