var shapegrammar = shapegrammar || {};

function register(callback) {
    if (window === undefined) {
        return;
    }
    if (window.requestAnimationFrame) {
        window.requestAnimationFrame(callback);
    }
    else if (window.webkitRequestAnimationFrame) {
        window.webkitRequestAnimationFrame(callback);
    }
    else if (window.mozRequestAnimationFrame) {
        window.mozRequestAnimationFrame(callback);
    }
    else if (window.oRequestAnimationFrame) {
        window.oRequestAnimationFrame(callback);
    }
    else {
        window.setTimeout(callback, 1000 / 60);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
function deg2rad(deg) {
    return deg / 180.0 * Math.PI;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
shapegrammar.Renderer = function(width, height, domParent) {
    this.scene = new THREE.Scene();
    var width = width;
    var height = height;
    var aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 1.5, 6);
    this.camera.lookAt(this.scene.position);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(new THREE.Color(1.0, 1.0, 1.0), 1.0);
    domParent.appendChild(this.renderer.domElement);
    this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
    this.canvas = this.renderer.domElement;
    this.meshes = [];
    register(this.loop.bind(this));
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
shapegrammar.Renderer.prototype.loop = function() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    register(this.loop.bind(this));
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
shapegrammar.Renderer.prototype.clearTerminals = function()
{
    for (var i = 0; i < this.meshes.length; i++)
        this.scene.remove(this.meshes[i]);
    this.meshes = [];
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
shapegrammar.Renderer.prototype.addTerminal = function(terminal) {
    var material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    var rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(deg2rad(terminal.scope.r.x), deg2rad(terminal.scope.r.y), deg2rad(terminal.scope.r.z)));
    var model = new THREE.Matrix4().makeScale(terminal.scope.s.x, terminal.scope.s.y, terminal.scope.s.z).multiply(
        new THREE.Matrix4().makeTranslation(terminal.scope.t.x, terminal.scope.t.y, terminal.scope.t.z).multiply(
            rotation
        )
    );
    var geometry = new THREE.Geometry();
    for (var i = 0; i < terminal.geometry.vertices.length; i++)
        geometry.vertices.push(terminal.geometry.vertices[i].applyMatrix4(model));
    var normals = new Array(terminal.geometry.normals.length);
    for (var i = 0; i < terminal.geometry.normals.length; i++)
        normals[i] = terminal.geometry.normals[i].applyMatrix4(rotation);
    var uvs = [];
    for (var i = 0; i < terminal.geometry.faces.length; i++)
        uvs.push(terminal.geometry.uvs[terminal.geometry.faces[i][2]]);
    geometry.faceVertexUvs.push(uvs);
    // FIXME: checking invariants
    if (terminal.geometry.faces.length % 3 != 0)
        throw new Error("non-triangular faces are not accepted!");
    for (var i = 0; i < terminal.geometry.faces.length; i += 3) {
        var i0 = terminal.geometry.faces[i], i1 = terminal.geometry.faces[i + 1], i2 = terminal.geometry.faces[i + 2];
        var face = new THREE.Face3(i0[0], i1[0], i2[0]);
        face.vertexNormals = [normals[i0[1]], normals[i1[1]], normals[i2[1]]];
        geometry.faces.push(face);
    }
    var mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    this.meshes.push(mesh);
}
