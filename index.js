import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.141.0/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/PointerLockControls.js';

// vars
let speed = 0.2;
let blockLine = false;
let renderDistance = 5; //8
let collision;
const blockScale = 1;
const chunksSize = 16;
const chunksChange = chunksSize * renderDistance / 3;
let chunks = [];
let xoff = 0;
let zoff = 0;
let inc = 0.05;
let amplitude = 6 * blockScale + (Math.random() * 10 * blockScale);

/* init */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 2 * blockScale, 30 * blockScale)
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.setClearColor(0x00F9FF, 1);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 30 * blockScale);
camera.position.set(0, 20, 0);
camera.lookAt(1, 0, 0);

/* PointerLockControls setting */
const controls = new PointerLockControls(camera, document.body);

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

const stats = new Stats();
stats.showPanel(0);
/*
FPS    Frames rendered in the last second. The higher the number the better.
MS     Milliseconds needed to render a frame. The lower the number the better.
MB     MBytes of allocated memory. (Run Chrome with --enable-precise-memory-info)
CUSTOM User-defined panel support.
 */
document.body.appendChild(stats.dom);

function animate() {
    stats.begin();

    stats.end();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

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
    });

    controls.addEventListener('unlock', function() {
        //menu.style.display = 'block';
    });
}

function Block(x, y, z) {
    const blockFace = [{
        dir: [-blockScale, 0, 0, "left"]
    }, {
        dir: [blockScale, 0, 0, "right"]
    }, {
        dir: [0, -blockScale, 0, "buttom"]
    }, {
        dir: [0, blockScale, 0, "top"]
    }, {
        dir: [0, 0, -blockScale, "back"]
    }, {
        dir: [0, 0, blockScale, "front"]
    }];

    this.x = x;
    this.y = y;
    this.z = z;
    this.mesh;
    this.line;

    this.getVoxel = function(x, y, z) {
        for (let i = 0; i < chunks.length; i++)
            for (let j = 0; j < chunks[i].length; j++)
                if (chunks[i][j].x == x && chunks[i][j].y == y && chunks[i][j].z == z)
                    return true;
        return false;
    };

    this.direction = [];
    this.adjustFace = function() {
        for (const { dir }
            of blockFace) {
            const overlap = this.getVoxel(
                this.x + dir[0],
                this.y + dir[1],
                this.z + dir[2]
            );
            if (overlap)
                this.direction.push(dir[3]);
            // switch (dir[3]) {
            //     case "right":
            //         this.direction.push("right");
            //         break;
            //     case "left":
            //         this.direction.push("left");
            //         break;
            //     case "buttom":
            //         this.direction.push("buttom");
            //         break;
            //     case "top":
            //         this.direction.push("top");
            //         break;
            //     case "back":
            //         this.direction.push("back");
            //         break;
            //     case "front":
            //         this.direction.push("front");
            //         break;
            // }
        }
    };

    this.display = function() {
        this.adjustFace();
        let blockBox = new THREE.BoxBufferGeometry(blockScale, blockScale, blockScale);
        //let blockMesh = new THREE.MeshBasicMaterial({ color: 0x44BC23 });
        texture["grass"].forEach(img => {
            //img.map.minFilter = THREE.NearestFilter;
            img.map.magFilter = THREE.NearestFilter;
        });
        this.mesh = new THREE.Mesh(blockBox, [
            (this.direction.includes("right") ? null : texture["grass"][0]),
            (this.direction.includes("left") ? null : texture["grass"][1]),
            (this.direction.includes("top") ? null : texture["grass"][2]),
            (this.direction.includes("buttom") ? null : texture["grass"][3]),
            (this.direction.includes("front") ? null : texture["grass"][4]),
            (this.direction.includes("back") ? null : texture["grass"][5]),
        ]);
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
            for (let z = highestZ + 1; z < highestZ + chunksSize + 1; z++) {
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
            for (let x = highestX + 1; x < highestX + (chunksSize) + 1; x++) {
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
    } else if (key["f11"]) controls.lock();

    if (camera.position.z <= edgeBlock({ axe: 'z', side: 0 }) + chunksChange) lowestZAlt('z-');
    else if (camera.position.z >= edgeBlock({ axe: 'z', side: 1 }) - chunksChange) highestZAlt('z+');
    else if (camera.position.x <= edgeBlock({ axe: 'x', side: 0 }) + chunksChange) lowestXAlt('x-');
    else if (camera.position.x >= edgeBlock({ axe: 'x', side: 1 }) - chunksChange) highestXAlt('x+');

    document.getElementById('axe').innerText = `X:${camera.position.x.toFixed(2)} Y:${camera.position.y.toFixed(2)} Z:${camera.position.z.toFixed(2)}`

    renderer.render(scene, camera);
    //console.log(chunks[0][0].direction)
}
update();