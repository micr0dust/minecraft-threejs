import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.141.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/PointerLockControls.js';

/* init */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(-15, 2, 0);
camera.lookAt(-14, 2, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/* PointerLockControls setting */
const controls = new PointerLockControls(camera, document.body);
controls.getObject().position.set(-15, 2, 0);
controls.getObject().lookAt(-14, 2, 0);
scene.add(controls.getObject());

// vars
let speed = 0.2;
let blockScale = 1;

function grid(range) {
    for (let i = -range; i < range; i++) {
        const material_line = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const points = [];
        points.push(new THREE.Vector3(i, 0, -range));
        points.push(new THREE.Vector3(i, 0, range));
        const geometry_line = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry_line, material_line);
        scene.add(line);
    }

    for (let i = -range; i < range; i++) {
        const material_line = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const points = [];
        points.push(new THREE.Vector3(-range, 0, i));
        points.push(new THREE.Vector3(range, 0, i));
        const geometry_line = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry_line, material_line);
        scene.add(line);
    }
}
grid(1000);

function terrain(range) {
    let blocks = [];
    let xoff = 0;
    let yoff = 0;
    let inc = Math.random() * 0.05;
    let amplitude = Math.random() * 100;
    for (let x = 0; x < range; x++) {
        xoff = 0;
        for (let z = 0; z < range; z++) {
            let v = Math.round(noise.perlin2(xoff, yoff) * amplitude / blockScale) * blockScale;
            blocks.push(new Block(x * blockScale, v, z * blockScale));
            xoff += inc;
        }
        yoff += inc;
    }
    for (let i = 0; i < blocks.length; i++) {
        blocks[i].display();
    }
}
terrain(20);

let key = {};
window.onload = function() {
    window.addEventListener('mousedown', function(event) {
        if (!controls.isLocked) controls.lock();
    }, false);


    onkeydown = onkeyup = function(event) {
        event.preventDefault();
        key[event.key.toLowerCase()] = event.type == 'keydown';
        //console.log(event.key);
    }

    onmousemove = function(e) {};

    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // add event listener to show/hide a UI (e.g. the game's menu)
    controls.addEventListener('lock', function() {
        //menu.style.display = 'none';
        console.log('lock');
    });

    controls.addEventListener('unlock', function() {
        //menu.style.display = 'block';
        console.log('unlock');
    });
}

function Block(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.display = function() {
        let blockBox = new THREE.BoxBufferGeometry(blockScale, blockScale, blockScale);
        let blockMesh = new THREE.MeshBasicMaterial({ color: 0x44BC23 });
        let block = new THREE.Mesh(blockBox, blockMesh);
        scene.add(block);
        block.position.x = this.x;
        block.position.y = this.y;
        block.position.z = this.z;
        let edges = new THREE.EdgesGeometry(blockBox);
        let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        scene.add(line);
        line.position.x = this.x;
        line.position.y = this.y;
        line.position.z = this.z;
    }
}

function animate() {
    requestAnimationFrame(animate);

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