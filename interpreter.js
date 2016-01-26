var shapegrammar = shapegrammar || {};

shapegrammar.AxiomTypes = [ "Box", "Quad" ];

shapegrammar.interpreter = (function() {

    var Call = function(successor) {
        this.successor = successor;
    }

    Call.prototype.apply = function(shape, context) {
        context.forward(this.successor, shape);
    }

    var Extrude = function(axis, extent, operation) {
        this.axis = axis; this.extent = extent; this.operation = operation;
    }

    Extrude.prototype.apply = function(shape, context) {
        var newType;
        if (shape.type == "Quad") {
            newType = "Box";
        } else
            throw new Error("don't know how to extrude " + shape.type);
        context.forward(this.operation, {
            type: newType,
            model: shape.model.clone().multiply(new THREE.Matrix4().set(
                1.0, 0.0, 0.0, 0.0,
                0.0, 0.0, -1.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0)),
            size: new THREE.Vector3(shape.size.x, this.extent, shape.size.y)
        });
    }

    var ComponentSplit = function(topOperation, bottomOperation, sideOperation) {
        this.topOperation = topOperation; this.bottomOperation = bottomOperation; this.sideOperation = sideOperation;
    }

    ComponentSplit.prototype.apply = function(shape, context) {
        if (shape.type == "Box") {
            var halfExtents = shape.size.clone().divideScalar(2.0);
            // top
            context.forward(this.topOperation, {
                type: "Quad",
                model: shape.model.clone().multiply(
                        new THREE.Matrix4().makeTranslation(0, halfExtents.y, 0).multiply(
                            new THREE.Matrix4().set(
                                1.0, 0.0, 0.0, 0.0,
                                0.0, 0.0, 1.0, 0.0,
                                0.0, -1.0, 0.0, 0.0,
                                0.0, 0.0, 0.0, 1.0
                            )
                        )
                    ),
                size: new THREE.Vector3(shape.size.x, shape.size.z, 1.0)
            });
            // bottom
            context.forward(this.bottomOperation, {
                type: "Quad",
                model: shape.model.clone().multiply(
                    new THREE.Matrix4().makeTranslation(0, -halfExtents.y, 0).multiply(
                        new THREE.Matrix4().set(
                            1.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, -1.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 1.0
                        )
                    )
                ),
                size: new THREE.Vector3(shape.size.x, shape.size.z, 1.0)
            });
            // back
            context.forward(this.sideOperation, {
                type: "Quad",
                model: shape.model.clone().multiply(
                    new THREE.Matrix4().makeTranslation(0, 0, -halfExtents.z).multiply(
                        new THREE.Matrix4().set(
                            -1.0, 0.0, 0.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, -1.0, 0.0,
                            0.0, 0.0, 0.0, 1.0
                        )
                    )
                ),
                size: new THREE.Vector3(shape.size.x, shape.size.y, 1.0)
            });
            // front
            context.forward(this.sideOperation, {
                type: "Quad",
                model: shape.model.clone().multiply(
                    new THREE.Matrix4().makeTranslation(0, 0, halfExtents.z)
                ),
                size: new THREE.Vector3(shape.size.x, shape.size.y, 1.0)
            });
            // left
            context.forward(this.sideOperation, {
                type: "Quad",
                model: shape.model.clone().multiply(
                    new THREE.Matrix4().makeTranslation(-halfExtents.x, 0, 0).multiply(
                        new THREE.Matrix4().set(
                            0.0, 0.0, -1.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            1.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 1.0
                        )
                    )
                ),
                size: new THREE.Vector3(shape.size.z, shape.size.y, 1.0)
            });
            // right
            context.forward(this.sideOperation, {
                type: "Quad",
                model: shape.model.clone().multiply(
                    new THREE.Matrix4().makeTranslation(halfExtents.x, 0, 0).multiply(
                        new THREE.Matrix4().set(
                            0.0, 0.0, 1.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            -1.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 1.0
                        )
                    )
                ),
                size: new THREE.Vector3(shape.size.z, shape.size.y, 1.0)
            });
        } else
            throw new Error("don't know how to comp " + shape.type);
    }

    var Scale = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Scale.prototype.apply = function(shape, context) {
        var x = (this.x > 0) ? this.x : shape.size.x * Math.abs(this.x);
        var y = (this.y > 0) ? this.y : shape.size.y * Math.abs(this.y);
        var z = (this.z > 0) ? this.z : shape.size.z * Math.abs(this.z);
        context.forward(this.operation, {
            type: shape.type,
            model: shape.model,
            size: new THREE.Vector3(x, y, z)
        });
    }

    var Rotate = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Rotate.prototype.apply = function(shape, context) {
        var transform = new THREE.Matrix4();
        transform.makeRotationFromEuler(new THREE.Vector3(this.x, this.y, this.z));
        context.forward(this.operation.apply, {
            type: shape.type,
            model: transform.multiply(shape.model),
            size: shape.size
        });
    }

    var Translate = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Translate.prototype.apply = function(shape, context) {
        var transform = new THREE.Matrix4();
        transform.makeTranslation(this.x, this.y, this.z);
        context.forward(this.operation, {
            type: shape.type,
            model: transform.multiply(shape.model),
            size: shape.size
        });
    }

    var Axis = {X:null, Y:null, Z:null};

    function parseAxis(value) {
        value = value.trim().toUpperCase();
        if (!(value in Axis))
            throw new Error(value + " is not an axis");
        return value;
    }

    function createOperation(successor) {
        if (typeof successor === "string") {
            // symbol
            return new Call(successor);
        } else {
            // shape operation
            if (successor.operator == "extrude") {
                if (successor.parameters.length != 2)
                    throw new Error("extrude expects 2 parameters");
                var axis = parseAxis(successor.parameters[0]);
                var extent = parseFloat(successor.parameters[1]);
                if (successor.operations.length != 1)
                    throw new Error("extrude expects 1 operation");
                return new Extrude(axis, extent, createOperation(successor.operations[0]));
            } else if (successor.operator == "comp") {
                if (successor.parameters.length != 0)
                    throw new Error("comp expects 0 parameters");
                if (successor.operations.length != 3)
                    throw new Error("comp expects 3 operations");
                return new ComponentSplit(createOperation(successor.operations[0].value),
                    createOperation(successor.operations[1].value),
                    createOperation(successor.operations[2].value));
            } else if (successor.operator == "split") {
                return new Split();
            } else if (successor.operator == "s") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 operation");
                return new Scale(x, y, z, createOperation(successor.operations[0]));
            } else if (successor.operator == "r") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 operation");
                return new Rotate(x, y, z, createOperation(successor.operations[0]));
            } else if (successor.operator == "t") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 operation");
                return new Translate(x, y, z, createOperation(successor.operations[0]));
            } else {
                throw new Error("unsupported operator");
            }
        }
    }

    var Context = function(rules, terminals) {
        this.rules = rules; this.terminals = terminals;
    }

    Context.prototype.forward = function(successor, shape) {
        if (typeof successor === "string") {
            if (successor in this.rules)
                this.forward(this.rules[successor], shape);
            else
                this.createTerminal(shape);
        } else {
            successor.apply(shape, this);
        }
    }

    Context.prototype.createTerminal = function(shape) {
        var geometry;
        if (shape.type == "Quad")
        {
            geometry = new THREE.PlaneGeometry(shape.size.x, shape.size.y);
        } else if (shape.type == "Box") {
            geometry = new THREE.BoxGeometry(shape.size.x, shape.size.y, shape.size.z);
        } else
            throw new Error(shape.type + " is not a supported terminal");

        var material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.applyMatrix(shape.model);
        this.terminals.push(mesh);
    }

    function interpret(axiom, symbol, parseTree) {
        if (!("type" in axiom))
            throw new Error("axiom doesn't have type");

        if (!("size" in axiom))
            throw new Error("axiom doesn't have size");

        if (!("position" in axiom))
            throw new Error("axiom doesn't have position");

        var rules = {};
        if (parseTree.constructor === Array) {
            for (var i = 0; i < parseTree.length; i++)
                rules[parseTree[i].predecessor] = createOperation(parseTree[i].successor);
        }
        else
            rules[parseTree.predecessor] = createOperation(parseTree.successor);
        var terminals = [];
        var model = new THREE.Matrix4();
        model.setPosition(axiom.position);
        var context = new Context(rules, terminals);
        context.forward(symbol, {
            type: axiom.type,
            model: model,
            size: axiom.size
        });
        return terminals;
    }

    return {
        interpret: interpret

    };

})();