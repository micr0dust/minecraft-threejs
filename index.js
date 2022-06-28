import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.141.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/PointerLockControls.js';

/* init */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 50, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.setClearColor(0x00F9FF, 1);
document.body.appendChild(renderer.domElement);

/* PointerLockControls setting */
const controls = new PointerLockControls(camera, document.body);

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

// vars
let speed = 0.2;
let blockLine = false;
let renderDistance = 3; //8
let collision;
const blockScale = 1;
const chunksSize = 8;
const chunksChange = 5; //30

let loaders = new THREE.TextureLoader();
let texture = {
    'grass': [
        new THREE.MeshBasicMaterial({ map: loaders.load("./textures/blocks/grass_side.png") }),
        new THREE.MeshBasicMaterial({ map: loaders.load("./textures/blocks/grass_side.png") }),
        new THREE.MeshBasicMaterial({ map: loaders.load("./textures/blocks/grass_top.png") }),
        new THREE.MeshBasicMaterial({ map: loaders.load("./textures/blocks/dirt.png") }),
        new THREE.MeshBasicMaterial({ map: loaders.load("./textures/blocks/grass_side.png") }),
        new THREE.MeshBasicMaterial({ map: loaders.load("./textures/blocks/grass_side.png") })
    ]
}

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
//grid(100);

let chunks = [];
let xoff = 0;
let zoff = 0;
let inc = 0.05;
let amplitude = 6 * blockScale + (Math.random() * 10 * blockScale);

function terrain() {
    for (let i = 0; i < renderDistance; i++) {
        for (let j = 0; j < renderDistance; j++) {
            let chunk = [];
            for (let x = i * chunksSize; x < (i * chunksSize) + chunksSize; x++)
                for (let z = j * chunksSize; z < (j * chunksSize) + chunksSize; z++) {
                    xoff = inc * x;
                    zoff = inc * z;
                    let v = Math.round(noise.perlin2(xoff, zoff) * amplitude / blockScale) * blockScale;
                    chunk.push(new Block(x * blockScale, v, z * blockScale));
                }
            chunks.push(chunk);
        }
    }
    for (let i = 0; i < chunks.length; i++)
        for (let j = 0; j < chunks[i].length; j++)
            chunks[i][j].display();
    for (let i = 0; i < chunks.length; i++)
        console.log(`[${i}]`, chunks[i][0]);
    console.log("------------------------------");
}
terrain();

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
    this.mesh;
    this.line;
    this.display = function() {
        let blockBox = new THREE.BoxBufferGeometry(blockScale, blockScale, blockScale);
        //let blockMesh = new THREE.MeshBasicMaterial({ color: 0x44BC23 });
        texture["grass"].forEach(img => {
            //img.map.minFilter = THREE.NearestFilter;
            img.map.magFilter = THREE.NearestFilter;
        });
        this.mesh = new THREE.Mesh(blockBox, texture["grass"]);
        scene.add(this.mesh);
        this.mesh.position.x = this.x;
        this.mesh.position.y = this.y;
        this.mesh.position.z = this.z;
        if (blockLine) {
            let edges = new THREE.EdgesGeometry(blockBox);
            this.line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
            scene.add(this.line);
            this.line.position.x = this.x;
            this.line.position.y = this.y;
            this.line.position.z = this.z;
        }
    }
}

function edgeBlock(side) {
    let posArr = [];
    for (let i = 0; i < chunks.length; i++)
        for (let j = 0; j < chunks[i].length; j++)
            if (side.axe == 'x') posArr.push(chunks[i][j].x);
            else if (side.axe == 'z') posArr.push(chunks[i][j].z);
    return side.side ? Math.max.apply(null, posArr) : Math.min.apply(null, posArr);
}

function lowestZAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if ((i + 1) % renderDistance == 0)
            for (let j = 0; j < chunks[i].length; j++) {
                scene.remove(chunks[i][j].mesh);
                scene.remove(chunks[i][j].line);
            }
        else
            newChunk.push(chunks[i]);
    }

    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let x = lowestX + (i * chunksSize); x < lowestX + ((i + 1) * chunksSize); x++) {
            for (let z = lowestZ - (chunksSize); z < lowestZ; z++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round(noise.perlin2(xoff, zoff) * amplitude / blockScale) * blockScale;
                chunk.push(new Block(x * blockScale, v, z * blockScale));
            }
        }
        newChunk.splice(i * renderDistance, 0, chunk);
    }
    chunks = newChunk;

    for (let i = 0; i < chunks.length; i++)
        if (i % (renderDistance) == 0)
            for (let j = 0; j < chunks[i].length; j++)
                chunks[i][j].display();
}

function highestZAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if (i % renderDistance == 0)
            for (let j = 0; j < chunks[i].length; j++) {
                scene.remove(chunks[i][j].mesh);
                scene.remove(chunks[i][j].line);
            }
        else
            newChunk.push(chunks[i]);
    }

    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let highestZ = edgeBlock({ axe: 'z', side: 1 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let x = lowestX + (i * chunksSize); x < lowestX + ((i + 1) * chunksSize); x++) {
            for (let z = highestZ; z < highestZ + chunksSize; z++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round(noise.perlin2(xoff, zoff) * amplitude / blockScale) * blockScale;
                chunk.push(new Block(x * blockScale, v, z * blockScale));
            }
        }
        newChunk.splice((i + 1) * renderDistance - 1, 0, chunk);
    }
    chunks = newChunk;

    for (let i = 0; i < chunks.length; i++)
        if ((i + 1) % (renderDistance) == 0)
            for (let j = 0; j < chunks[i].length; j++)
                chunks[i][j].display();
}

function lowestXAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if (i >= chunks.length - renderDistance)
            for (let j = 0; j < chunks[i].length; j++) {
                scene.remove(chunks[i][j].mesh);
                scene.remove(chunks[i][j].line);
            }
        else
            newChunk.push(chunks[i]);
    }

    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let z = lowestZ + (i * chunksSize); z < lowestZ + ((i + 1) * chunksSize); z++) {
            for (let x = lowestX - (chunksSize); x < lowestX; x++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round(noise.perlin2(xoff, zoff) * amplitude / blockScale) * blockScale;
                chunk.push(new Block(x * blockScale, v, z * blockScale));
            }
        }
        newChunk.splice(i, 0, chunk);
    }
    chunks = newChunk;

    for (let i = 0; i < renderDistance; i++)
        for (let j = 0; j < chunks[i].length; j++)
            chunks[i][j].display();
}

function highestXAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if (i < renderDistance)
            for (let j = 0; j < chunks[i].length; j++) {
                scene.remove(chunks[i][j].mesh);
                scene.remove(chunks[i][j].line);
            }
        else
            newChunk.push(chunks[i]);
    }

    let highestX = edgeBlock({ axe: 'x', side: 1 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let z = lowestZ + (i * chunksSize); z < lowestZ + ((i + 1) * chunksSize); z++) {
            for (let x = highestX; x < highestX + (chunksSize); x++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round(noise.perlin2(xoff, zoff) * amplitude / blockScale) * blockScale;
                chunk.push(new Block(x * blockScale, v, z * blockScale));
            }
        }
        newChunk.splice(i + chunks.length - renderDistance, 0, chunk);
    }
    chunks = newChunk;

    for (let i = renderDistance * renderDistance - renderDistance; i < chunks.length; i++)
        for (let j = 0; j < chunks[i].length; j++)
            chunks[i][j].display();
}



function update() {
    requestAnimationFrame(update);
    if (controls.isLocked === true) {
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
        //playerDirection.normalize();
        controls.moveForward(playerDirection.z * speed);
        controls.moveRight(-playerDirection.x * speed);
        if (playerDirection.y) camera.position.add(new THREE.Vector3(0, playerDirection.y * speed, 0));

        if (camera.position.z <= edgeBlock({ axe: 'z', side: 0 }) + chunksChange) lowestZAlt();
        else if (camera.position.z >= edgeBlock({ axe: 'z', side: 1 }) - chunksChange) highestZAlt();
        else if (camera.position.x <= edgeBlock({ axe: 'x', side: 0 }) + chunksChange) lowestXAlt();
        else if (camera.position.x >= edgeBlock({ axe: 'x', side: 1 }) - chunksChange) highestXAlt();
    } else if (key["f11"]) controls.lock();
    document.getElementById('info').innerText = `X:${camera.position.x.toFixed(2)} Y:${camera.position.y.toFixed(2)} Z:${camera.position.z.toFixed(2)}`

    renderer.render(scene, camera);
}
update();