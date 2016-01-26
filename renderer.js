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

function loop () {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    register(loop.bind(this));
}

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
    register(loop.bind(this));
}


