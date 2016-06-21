var shapegrammar = shapegrammar || {};

shapegrammar.AxiomTypes = [ "Box", "Quad" ];

shapegrammar.interpreter = (function() {

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
    var SemanticSelector = { FRONT:0, BACK:1, LEFT:2, RIGHT:3, TOP:4, BOTTOM:5, SIDE:6, ALL:7 };
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
    function cloneGeometry(geometry) {
        var vertices = new Array(geometry.vertices.length),
            normals = new Array(geometry.normals.length),
            uvs = new Array(geometry.uvs.length),
            faces = new Array(geometry.faces.length);
        for (var i = 0; i < geometry.vertices.length; i++)
            vertices[i] = geometry.vertices[i].clone();
        for (var i = 0; i < geometry.normals.length; i++)
            normals[i] = geometry.normals[i].clone();
        for (var i = 0; i < geometry.uvs.length; i++)
            uvs[i] = geometry.uvs[i].clone();
        for (var i = 0; i < geometry.faces.length; i++)
            faces[i] = geometry.faces[i].slice();
        return {
            vertices: vertices,
            normals: normals,
            uvs: uvs,
            faces: faces

        };
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    function cloneShape(symbol) {
        return {
            initialShape: {
                name: symbol.initialShape.name,
                startRule: symbol.initialShape.startRule,
                origin: {
                    p: symbol.initialShape.origin.p.clone(),
                    o: symbol.initialShape.origin.o.clone()
                }
            },
            scope: {
                t: symbol.scope.t.clone(),
                r: symbol.scope.r.clone(),
                s: symbol.scope.s.clone()
            },
            pivot: {
                p: symbol.pivot.p.clone(),
                o: symbol.pivot.o.clone()
            },
            geometry: cloneGeometry(symbol.geometry),
            comp: {
                sel: symbol.comp.sel,
                index: symbol.comp.index,
                total: symbol.comp.total
            }
        };
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
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
        var right = new THREE.Vector3(1, 0, 0),
            up = new THREE.Vector3(0, 1, 0),
            back = new THREE.Vector3(0, 0, 1);
        var facesByDirection = [[],[],[],[],[],[]];
        var halfPI = Math.PI * 0.5,
            oneHalfPI = Math.PI * 1.5;
        for (var i = 0; i < shape.geometry.faces.length; i += 3) {
            var p0 = shape.geometry.vertices[shape.geometry.faces[i][0]],
                p1 = shape.geometry.vertices[shape.geometry.faces[i + 1][0]],
                p2 = shape.geometry.vertices[shape.geometry.faces[i + 2][0]];
            var n0 = shape.geometry.normals[shape.geometry.faces[i][1]],
                n1 = shape.geometry.normals[shape.geometry.faces[i + 1][1]],
                n2 = shape.geometry.normals[shape.geometry.faces[i + 2][1]];
            var faceNormal = computeFaceNormal(p0, p1, p2, n0, n1, n2);
            var a0 = faceNormal.angleTo(right);
            if (a0 < halfPI && a0 > -halfPI)
                facesByDirection[SemanticSelector.RIGHT].push(i);
            else if (a0 > oneHalfPI && a0 < -oneHalfPI)
                facesByDirection[SemanticSelector.LEFT].push(i);
            a0 = faceNormal.angleTo(up);
            if (a0 < halfPI && a0 > -halfPI)
                facesByDirection[SemanticSelector.TOP].push(i);
            else if (a0 > oneHalfPI && a0 < -oneHalfPI)
                facesByDirection[SemanticSelector.BOTTOM].push(i);
            a0 = faceNormal.angleTo(back);
            if (a0 < halfPI && a0 > -halfPI)
                facesByDirection[SemanticSelector.BACK].push(i);
            else if (a0 > oneHalfPI && a0 < -oneHalfPI)
                facesByDirection[SemanticSelector.FRONT].push(i);
        }
        var halfExtents = shape.size.clone().divideScalar(2.0);
        for (var i = 0; i < this.operations.length; i++)
        {
            var operation = this.operations[i];
            if (operation.semanticSelector == "TOP")
            {
                this.forwardFaces(facesByDirection[SemanticSelector.TOP]);
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
        var newShape = cloneShape(shape);
        newShape.scope.s.x = x;
        newShape.scope.s.y = y;
        newShape.scope.s.z = z;
        context.forward(this.operation, newShape);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Rotate = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Rotate.prototype.apply = function(shape, context) {
        var newShape = cloneShape(shape);
        newShape.scope.r.x += this.x;
        newShape.scope.r.y += this.y;
        newShape.scope.r.z += this.z;
        context.forward(this.operation, newShape);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    var Translate = function(x, y, z, operation) {
        this.x = x; this.y = y; this.z = z; this.operation = operation;
    }

    Translate.prototype.apply = function(shape, context) {
        var newShape = cloneShape(shape);
        newShape.scope.t.x = this.x;
        newShape.scope.t.y = this.y;
        newShape.scope.t.z = this.z;
        context.forward(this.operation, newShape);
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
                this.terminals.push(shape);
        } else {
            successor.apply(shape, this);
        }
    }

    function createGeometry(type) {
        if (type == "Box") {
            return {
                vertices: [
                    /*0*/new THREE.Vector3(-0.5, 0.5, 0.5),
                    /*1*/new THREE.Vector3(0.5, 0.5, 0.5),
                    /*2*/new THREE.Vector3(0.5, 0.5, -0.5),
                    /*3*/new THREE.Vector3(-0.5, 0.5, -0.5),
                    /*4*/new THREE.Vector3(0.5, -0.5, -0.5),
                    /*5*/new THREE.Vector3(-0.5, -0.5, -0.5),
                    /*6*/new THREE.Vector3(-0.5, -0.5, 0.5),
                    /*7*/new THREE.Vector3(0.5, -0.5, 0.5)
                ],
                normals: [
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, -1, 0),
                    new THREE.Vector3(0, 0, 1),
                    new THREE.Vector3(0, 0, -1),
                    new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(-1, 0, 0)
                ],
                uvs: [
                    new THREE.Vector2(0, 0),
                    new THREE.Vector2(1, 1),
                    new THREE.Vector2(0, 1),
                    new THREE.Vector2(1, 0)
                ],
                faces: [
                    // top
                    [0,0,0], [1,0,1], [2,0,2],
                    [0,0,0], [2,0,2], [3,0,3],

                    // bottom
                    [4,1,0], [5,1,1], [6,1,2],
                    [4,1,0], [6,1,2], [7,1,3],

                    // back
                    [6,2,0], [7,2,1], [1,2,2],
                    [6,2,0], [1,2,2], [0,2,3],

                    // front
                    [4,3,0], [5,3,1], [3,3,2],
                    [4,3,0], [3,3,2], [2,3,3],

                    // right
                    [7,4,0], [4,4,1], [2,4,2],
                    [7,4,0], [2,4,2], [1,4,3],

                    // left
                    [6,5,0], [5,5,1], [3,5,2],
                    [6,5,0], [3,5,2], [0,5,3]

            ]};
        } else if (type == "Quad") {
            return {
                vertices: [
                    /*0*/new THREE.Vector3(-0.5, -0.5, 0.5),
                    /*1*/new THREE.Vector3(0.5, -0.5, 0.5),
                    /*2*/new THREE.Vector3(0.5, 0.5, 0.5),
                    /*3*/new THREE.Vector3(-0.5, 0.5, 0.5)

                ],
                normals: [
                    new THREE.Vector3(0, 0, 1)
                ],
                uvs: [
                    new THREE.Vector2(0, 0),
                    new THREE.Vector2(1, 1),
                    new THREE.Vector2(0, 1),
                    new THREE.Vector2(1, 0)
                ],
                faces: [
                    // back
                    [0,0,0], [1,0,1], [2,0,2],
                    [0,0,0], [2,0,2], [3,0,3]

                ]};
        } else
            throw new Error("unknown geometry type");
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
        var context = new Context(rules, terminals);
        context.forward(symbol, {
            initialShape: {
                name: axiom.type,
                startRule: symbol,
                origin: {
                    p: axiom.position.clone(),
                    o: new THREE.Vector3(0, 0, 0)
                }
            },
            scope: {
                t: axiom.position.clone(),
                r: new THREE.Vector3(0, 0, 0),
                s: axiom.size.clone()
            },
            pivot: {
                p: new THREE.Vector3(0, 0, 0),
                o: new THREE.Vector3(0, 0, 0)
            },
            geometry: createGeometry(axiom.type),
            comp: {
                sel: null,
                index: -1,
                total: 0
            }
        });
        return terminals;
    }

    return {
        interpret: interpret

    };

})();