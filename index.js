import { GLTFLoader } from 'https://unpkg.com/three@0.141.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/PointerLockControls.js';

/* init */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(-15, 2, 0);
camera.lookAt(-14, 2, 0);
let walkDirection = new THREE.Vector3(0, 0, 0);
let speed = 0.1;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/* PointerLockControls setting */
const controls = new PointerLockControls(camera, document.body);
controls.getObject().position.set(-15, 2, 0)
controls.getObject().lookAt(-14, 2, 0);
scene.add(controls.getObject())

// add event listener to show/hide a UI (e.g. the game's menu)
controls.addEventListener('lock', function() {
    //menu.style.display = 'none';
    console.log('lock');
});

controls.addEventListener('unlock', function() {
    //menu.style.display = 'block';
    console.log('unlock');
});

/* cube */
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

/* grid start */
for (let i = -1000; i < 1000; i++) {
    const material_line = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const points = [];
    points.push(new THREE.Vector3(i, 0, -1000));
    points.push(new THREE.Vector3(i, 0, 1000));
    const geometry_line = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry_line, material_line);
    scene.add(line);
}

for (let i = -1000; i < 1000; i++) {
    const material_line = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const points = [];
    points.push(new THREE.Vector3(-1000, 0, i));
    points.push(new THREE.Vector3(1000, 0, i));
    const geometry_line = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry_line, material_line);
    scene.add(line);
}
/* grid end */

const image = new Image();
image.onload = function(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;
    ctx.drawImage(this, 0, 0, 512, 512);
    material.map = new THREE.Texture(canvas);
    material.map.needsUpdate = true;
    scene.add(cube);
}
image.crossOrigin = "anonymous";
image.src = './textures/age_of_gunpowder.png';

let key = {};
window.onload = function() {
    window.addEventListener('mousedown', function(event) {
        if (!controls.isLocked) controls.lock();
    }, false);


    onkeydown = onkeyup = function(event) {
        event.preventDefault();
        key[event.key.toLowerCase()] = event.type == 'keydown';
        //console.log(event.key);
        //console.log(controls.getObject().position);
        console.log(controls.getObject().position.y);
    }

    onmousemove = function(e) {};

    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    //camera.lookAt(0, 0, 0);
    if (controls.isLocked === true) {
        let lastY = controls.getObject().position.y
        let playerDirection = new THREE.Vector3(0, 0, 0);
        let moveForward = key["w"] || false;
        let moveLeft = key["a"] || false;
        let moveBackward = key["s"] || false;
        let moveRight = key["d"] || false;
        let moveUp = key[" "] || false;
        let moveDown = key["shift"] || false;
        let canJump = false
        playerDirection.x = Number(moveLeft) - Number(moveRight);
        playerDirection.z = Number(moveForward) - Number(moveBackward);
        playerDirection.y = Number(moveUp) - Number(moveDown);
        playerDirection.normalize();
        controls.getObject().translateX(-playerDirection.x * speed);
        controls.getObject().translateZ(-playerDirection.z * speed);
        if (playerDirection.y) controls.getObject().position.add(new THREE.Vector3(0, playerDirection.y * speed, 0));
        else controls.getObject().position.y = lastY;
    } else if (key["f11"]) controls.lock();
    document.getElementById('info').innerText = `X:${camera.position.x.toFixed(2)} Y:${camera.position.y.toFixed(2)} Z:${camera.position.z.toFixed(2)}`
    renderer.render(scene, camera);
}
animate();