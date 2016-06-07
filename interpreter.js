var shapegrammar = shapegrammar || {};

shapegrammar.AxiomTypes = [ "Box", "Quad" ];

shapegrammar.interpreter = (function() {

    var Call = function(successor) {
        this.successor = successor;
    }

    Call.prototype.apply = function(shape, context) {
        context.forward(this.successor, shape);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Extrude = function(axis, extent, operation) {
        this.axis = axis; this.extent = extent; this.operation = operation;
    }

    Extrude.prototype.apply = function(shape, context) {
        var newType;
        if (shape.type == "Quad") {
            newType = "Box";
        } else
            throw new Error("don't know how to extrude " + shape.type);
        var transform = new THREE.Matrix4();
        if (this.axis == "X") {
            transform = transform.set(
                0.0, 0.0, 1.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        } else if (this.axis == "Y") {
            transform = transform.set(
                -1.0, 0.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        } else if (this.axis == "Z") {
            transform = transform.set(
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        }
        context.forward(this.operation, {
            type: newType,
            model: shape.model.clone().multiply(transform),
            size: new THREE.Vector3(shape.size.x, this.extent, shape.size.y)
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var ComponentSplit = function(componentSelector, operations) {
        this.componentSelector = componentSelector;
        this.operations = operations;
    }

    ComponentSplit.prototype.forwardBoxTop = function(shape, context, halfExtents, successor)
    {
        context.forward(successor, {
            type: "Quad",
            model: shape.model.clone().multiply(
                new THREE.Matrix4().makeTranslation(0, halfExtents.y, 0).multiply(
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
    }

    ComponentSplit.prototype.forwardBoxBottom = function(shape, context, halfExtents, successor) {
        context.forward(successor, {
            type: "Quad",
            model: shape.model.clone().multiply(
                new THREE.Matrix4().makeTranslation(0, -halfExtents.y, 0).multiply(
                    new THREE.Matrix4().set(
                        1.0, 0.0, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        0.0, 0.0, 0.0, 1.0
                    )
                )
            ),
            size: new THREE.Vector3(shape.size.x, shape.size.z, 1.0)
        });
    }

    ComponentSplit.prototype.forwardBoxBack = function(shape, context, halfExtents, successor) {
        context.forward(successor, {
            type: "Quad",
            model: shape.model.clone().multiply(
                new THREE.Matrix4().makeTranslation(0, 0, halfExtents.z).multiply(
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
    }

    ComponentSplit.prototype.forwardBoxFront = function(shape, context, halfExtents, successor) {
        context.forward(successor, {
            type: "Quad",
            model: shape.model.clone().multiply(
                new THREE.Matrix4().makeTranslation(0, 0, -halfExtents.z).multiply(
                    new THREE.Matrix4().set(
                        1.0, 0.0, 0.0, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        0.0, 0.0, 0.0, 1.0
                    )
                )
            ),
            size: new THREE.Vector3(shape.size.x, shape.size.y, 1.0)
        });
    }

    ComponentSplit.prototype.forwardBoxLeft = function(shape, context, halfExtents, successor) {
        context.forward(successor, {
            type: "Quad",
            model: shape.model.clone().multiply(
                new THREE.Matrix4().makeTranslation(-halfExtents.x, 0, 0).multiply(
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
    }

    ComponentSplit.prototype.forwardBoxRight = function(shape, context, halfExtents, successor) {
        context.forward(successor, {
            type: "Quad",
            model: shape.model.clone().multiply(
                new THREE.Matrix4().makeTranslation(halfExtents.x, 0, 0).multiply(
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
    }

    ComponentSplit.prototype.apply = function(shape, context) {
        if (this.componentSelector != "F")
        {
            throw new Error("unsupported component selector");
        }
        if (shape.type == "Box") {
            var halfExtents = shape.size.clone().divideScalar(2.0);
            for (var i = 0; i < this.operations.length; i++)
            {
                var operation = this.operations[i];
                if (operation.semanticSelector == "TOP")
                {
                    this.forwardBoxTop(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "BOTTOM")
                {
                    this.forwardBoxBottom(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "BACK")
                {
                    this.forwardBoxBack(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "FRONT")
                {
                    this.forwardBoxFront(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "LEFT")
                {
                    this.forwardBoxLeft(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "RIGHT")
                {
                    this.forwardBoxRight(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "SIDE")
                {
                    this.forwardBoxBack(shape, context, halfExtents, operation.successor);
                    this.forwardBoxFront(shape, context, halfExtents, operation.successor);
                    this.forwardBoxLeft(shape, context, halfExtents, operation.successor);
                    this.forwardBoxRight(shape, context, halfExtents, operation.successor);
                }
                else if (operation.semanticSelector == "ALL")
                {
                    this.forwardBoxTop(shape, context, halfExtents, operation.successor);
                    this.forwardBoxBottom(shape, context, halfExtents, operation.successor);
                    this.forwardBoxBack(shape, context, halfExtents, operation.successor);
                    this.forwardBoxFront(shape, context, halfExtents, operation.successor);
                    this.forwardBoxLeft(shape, context, halfExtents, operation.successor);
                    this.forwardBoxRight(shape, context, halfExtents, operation.successor);
                }
                else
                    // FIXME: checking invariants
                    throw new Error("unknown semantic selector");
            }
        } else
            throw new Error("don't know how to comp " + shape.type);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Scale = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Scale.prototype.apply = function(shape, context) {
        var x = (this.x > 0) ? this.x : shape.size.x * Math.abs(this.x);
        var y = (this.y > 0) ? this.y : shape.size.y * Math.abs(this.y);
        var z = (this.z > 0) ? this.z : shape.size.z * Math.abs(this.z);
        context.forward(this.operation, {
            type: shape.type,
            model: shape.model.clone(),
            size: new THREE.Vector3(x, y, z)
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Rotate = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Rotate.prototype.apply = function(shape, context) {
        context.forward(this.operation.apply, {
            type: shape.type,
            model: shape.model.clone().multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Vector3(this.x, this.y, this.z))),
            size: shape.size
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Translate = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Translate.prototype.apply = function(shape, context) {
        context.forward(this.operation, {
            type: shape.type,
            model: shape.model.clone().multiply(new THREE.Matrix4().makeTranslation(this.x, this.y, this.z)),
            size: shape.size
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Axis = {X:null, Y:null, Z:null};
    function parseAxis(value) {
        value = value.trim().toUpperCase();
        if (!(value in Axis))
            throw new Error(value + " is not an axis");
        return value;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var ComponentSelector = {F:null, E:null, V:null};
    function parseComponentSelector(value) {
        value = value.trim().toUpperCase();
        if (!(value in ComponentSelector))
            throw new Error(value + " is not a component selector");
        return value;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var SemanticSelector = { FRONT:null, BACK:null, LEFT:null, RIGHT:null, TOP:null, BOTTOM:null, SIDE:null, ALL:null };
    function parseSemanticSelector(value) {
        value = value.trim().toUpperCase();
        if (!(value in SemanticSelector))
            throw new Error(value + " is not a semantic selector");
        return value;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    function parseComponentSplitOperator(value) {
        if (value != ":" && value != "=")
            throw new Error(value + " is not a comp operator");
        return value;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    function createOperation(successor) {
        if (typeof successor === "string") {
            // symbol
            if (successor != "NIL")
                return new Call(successor);
        } else {
            // shape operation
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            if (successor.operator == "extrude") {
                if (successor.parameters.length != 2)
                    throw new Error("extrude expects 2 parameters");
                var axis = (successor.parameters[0] != null) ? parseAxis(successor.parameters[0]) : "Z";
                var extent = parseFloat(successor.parameters[1]);
                if (successor.operations.length != 1)
                    throw new Error("extrude expects 1 operation");
                return new Extrude(axis, extent, createOperation(successor.operations[0]));
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            } else if (successor.operator == "comp") {
                if (successor.parameters.length != 1)
                    throw new Error("comp expects 1 parameter");
                if (successor.operations.length == 0)
                    throw new Error("comp expects at least 1 operation");
                var componentSelector = parseComponentSelector(successor.parameters[0]);
                var operations = [];
                for (var i = 0; i < successor.operations.length; i++)
                    var operation = successor.operations[i];
                    operations.push({
                        semanticSelector: parseSemanticSelector(operation.semanticSelector),
                        operator: parseComponentSplitOperator(operation.operator),
                        successor: createOperation(operation.successor)
                    });
                return new ComponentSplit(componentSelector, operations);
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            } else if (successor.operator == "split") {
                if (successor.parameters.length != 3)
                    throw new Error("split expects 3 parameters");
                if (successor.operations.length == 0)
                    throw new Error("split expects at least 1 operation");
                // TODO:
                return new XYZSplit();
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            } else if (successor.operator == "s") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 operation");
                return new Scale(x, y, z, createOperation(successor.operations[0]));
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            } else if (successor.operator == "r") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 operation");
                return new Rotate(x, y, z, createOperation(successor.operations[0]));
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            } else if (successor.operator == "t") {
                if (successor.parameters.length != 3)
                    throw new Error("scale expects 3 parameters");
                var x = parseFloat(successor.parameters[0]);
                var y = parseFloat(successor.parameters[1]);
                var z = parseFloat(successor.parameters[2]);
                if (successor.operations.length != 1)
                    throw new Error("scale expects 1 operation");
                return new Translate(x, y, z, createOperation(successor.operations[0]));
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            } else {
                throw new Error("unimplemented operator");
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