import * as THREE from 'three'
import { GLTFLoader } from 'https://unpkg.com/three@0.141.0/examples/jsm/loaders/GLTFLoader.js'
import { PointerLockControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/PointerLockControls.js'

//texture
let loaders = new THREE.TextureLoader();

function NearestFilter(texture) {
    texture.magFilter = THREE.NearestFilter;
}

let texture = {
    grass: [
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png', (texture) => { NearestFilter(texture) })
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png', (texture) => { NearestFilter(texture) })
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_top.png', (texture) => { NearestFilter(texture) }),
            color: 0xBBFFBB
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/dirt.png', (texture) => { NearestFilter(texture) })
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png', (texture) => { NearestFilter(texture) })
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png', (texture) => { NearestFilter(texture) })
        })
    ]
};

// texture["grass"].forEach(img => {
//     //img.map.minFilter = THREE.NearestFilter;
//     img.map.magFilter = THREE.NearestFilter;
// });

// vars
const blockScale = 1;
const chunksSize = 16;
const coolDown = 8;
const renderDistance = 8;
const worldSize = chunksSize * renderDistance * blockScale;
const chunksChange = worldSize * 0.4;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0.5 * 2 - 1, -1 * 0.5 * 2 + 1);
const initGravity = 0.015 * blockScale;
const initYspeed = 0;
const deceleration = 1.35;
const jumpSpeed = 0.17 * blockScale;
const depth = 5;
const minWorldY = -25;
let armsLen = 10;
let chunks = [];
let xoff = 0;
let zoff = 0;
let inc = 0.05;
let amplitude = 6 * blockScale + Math.random() * 10 * blockScale;
let blockBox = new THREE.BoxGeometry(blockScale, blockScale, blockScale);
let instancedChunk = new THREE.InstancedMesh(
    blockBox,
    texture['grass'],
    chunksSize * chunksSize * renderDistance * renderDistance
);
let speed = 0.13 * blockScale;
let blockLine = false;
let plane;
let ctrlKey = {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd',
    jump: ' ',
    squat: 'shift',
    use: 'secondary',
    destory: 'main'
};
let placed = [];
let destroyed = [];
let chunkMap = [];
let coolDownTime = 0;
let gamemode = 1;
let sprintSpeedInc = 1.5;
let sprint = false;
let fly = false;
let gravity = initGravity;
let yspeed = initYspeed;
let canJump = false;
let jumping = false;
let autoJump = true;
let lastY = 0;
let jumpCd = 0;

/* init */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc0ffff);
scene.fog = new THREE.Fog(0xd0ffff, 2 * blockScale, chunksChange);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.setClearColor(0x00F9FF, 1);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.01,
    chunksChange
);
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

function statsPanel() {
    stats.begin();

    stats.end();
}

function terrain() {
    for (let i = 0; i < renderDistance; i++) {
        for (let j = 0; j < renderDistance; j++) {
            let chunk = [];
            for (let x = i * chunksSize; x < i * chunksSize + chunksSize; x++)
                for (let z = j * chunksSize; z < j * chunksSize + chunksSize; z++) {
                    xoff = inc * x;
                    zoff = inc * z;
                    let v = Math.round((noise.perlin2(xoff, zoff) * amplitude) / blockScale) * blockScale;
                    for (let d = 0; d < depth; d++)
                        if (v - d * blockScale >= minWorldY)
                            chunk.push(new Block(x * blockScale, v - d * blockScale, z * blockScale));
                }
            chunks.push(chunk);
            chunkMap.push({ x: i, z: j });
        }
    }
    reDraw();
}
terrain();

function identifyChunk(x, z) {
    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    let divX = Math.floor((x - lowestX) / (chunksSize * blockScale));
    let divZ = Math.floor((z - lowestZ) / (chunksSize * blockScale));
    for (let i = 0; i < chunkMap.length; i++)
        if (chunkMap[i].x == divX && chunkMap[i].z == divZ) return i;
    return undefined;
}

let player = {
    width: 0.8 * blockScale,
    height: 2 * blockScale,
    depth: 0.7 * blockScale,
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    forward: function(speed) {
        controls.moveForward(speed);
        this.updatePosition();
    },
    backward: function(speed) {
        controls.moveForward(-speed);
        this.updatePosition();
    },
    right: function(speed) {
        controls.moveRight(speed);
        this.updatePosition();
    },
    left: function(speed) {
        controls.moveRight(-speed);
        this.updatePosition();
    },
    updatePosition: function() {
        this.x = camera.position.x;
        this.y = camera.position.y - this.height / 2;
        this.z = camera.position.z;
    }
};

function intersect(objA, objB) {
    let a = {
        minX: objA.x - objA.width / 2,
        maxX: objA.x + objA.width / 2,
        minY: objA.y - objA.height / 2,
        maxY: objA.y + objA.height / 2,
        minZ: objA.z - objA.depth / 2,
        maxZ: objA.z + objA.depth / 2,
    };
    let b = {
        minX: objB.x - objB.width / 2,
        maxX: objB.x + objB.width / 2,
        minY: objB.y - objB.height / 2,
        maxY: objB.y + objB.height / 2,
        minZ: objB.z - objB.depth / 2,
        maxZ: objB.z + objB.depth / 2,
    };
    return (a.minX <= b.maxX && a.maxX >= b.minX) &&
        (a.minY <= b.maxY && a.maxY >= b.minY) &&
        (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
}

let key = {};
window.onload = function() {
    onmousedown = onmouseup = function(event) {
        event.preventDefault()
        if (!controls.isLocked) controls.lock()
        const mouseClick = ['main', 'auxiliary', 'secondary', 'fourth', 'fifth']
        key[mouseClick[event.button]] = event.type == 'mousedown'
            //console.log(mouseClick[event.button]);
    }

    onkeydown = onkeyup = function(event) {
        event.preventDefault()
        key[event.key.toLowerCase()] = event.type == 'keydown'
            //console.log(event.key);
    }

    onmousemove = function(e) {}

    window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight)
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
    })

    // add event listener to show/hide a UI (e.g. the game's menu)
    controls.addEventListener('lock', function() {
        //menu.style.display = 'none';
    })

    controls.addEventListener('unlock', function() {
        //menu.style.display = 'block';
    })
}

function Block(x, y, z, placed) {
    const blockFace = [{
            dir: [-blockScale, 0, 0, 'left']
        },
        {
            dir: [blockScale, 0, 0, 'right']
        },
        {
            dir: [0, -blockScale, 0, 'buttom']
        },
        {
            dir: [0, blockScale, 0, 'top']
        },
        {
            dir: [0, 0, -blockScale, 'back']
        },
        {
            dir: [0, 0, blockScale, 'front']
        }
    ];

    this.x = x;
    this.y = y;
    this.z = z;
    this.width = blockScale;
    this.height = blockScale;
    this.depth = blockScale;
    this.placed = placed;

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
            if (overlap) this.direction.push(dir[3]);
        }
    };
}

function placeBlock() {
    coolDownTime = coolDown;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    pointer.x = 0.5 * 2 - 1;
    pointer.y = -0.5 * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    let intersection = raycaster.intersectObject(instancedChunk);

    if (intersection[0] != undefined && intersection[0].distance < armsLen) {
        let materiaIndex = intersection[0].face.materialIndex;
        let position = intersection[0].point;
        let x = 0,
            y = 0,
            z = 0;
        const inc = blockScale / 2;
        switch (materiaIndex) {
            case 0:
                x = position.x + inc;
                y = Math.round(position.y / blockScale) * blockScale;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 1:
                x = position.x - inc;
                y = Math.round(position.y / blockScale) * blockScale;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 2:
                x = Math.round(position.x / blockScale) * blockScale;
                y = position.y + inc;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 3:
                x = Math.round(position.x / blockScale) * blockScale;
                y = position.y - inc;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 4:
                x = Math.round(position.x / blockScale) * blockScale;
                y = Math.round(position.y / blockScale) * blockScale;
                z = position.z + inc;
                break;
            case 5:
                x = Math.round(position.x / blockScale) * blockScale;
                y = Math.round(position.y / blockScale) * blockScale;
                z = position.z - inc;
                break;
        }
        chunks[identifyChunk(x, z)].push(new Block(x, y, z, true));
        placed.push({ x: x, y: y, z: z });
        reDraw();
    }
}

function destoryBlock() {
    coolDownTime = coolDown;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    pointer.x = 0.5 * 2 - 1;
    pointer.y = -0.5 * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    let intersection = raycaster.intersectObject(instancedChunk);

    if (intersection[0] != undefined && intersection[0].distance < armsLen) {
        let materiaIndex = intersection[0].face.materialIndex;
        let position = intersection[0].point;
        let x = 0,
            y = 0,
            z = 0;
        const inc = -blockScale / 2;
        switch (materiaIndex) {
            case 0:
                x = position.x + inc;
                y = Math.round(position.y / blockScale) * blockScale;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 1:
                x = position.x - inc;
                y = Math.round(position.y / blockScale) * blockScale;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 2:
                x = Math.round(position.x / blockScale) * blockScale;
                y = position.y + inc;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 3:
                x = Math.round(position.x / blockScale) * blockScale;
                y = position.y - inc;
                z = Math.round(position.z / blockScale) * blockScale;
                break;
            case 4:
                x = Math.round(position.x / blockScale) * blockScale;
                y = Math.round(position.y / blockScale) * blockScale;
                z = position.z + inc;
                break;
            case 5:
                x = Math.round(position.x / blockScale) * blockScale;
                y = Math.round(position.y / blockScale) * blockScale;
                z = position.z - inc;
                break;
        }
        let chunk = chunks[identifyChunk(x, z)];
        for (let i = 0; i < chunk.length; i++) {
            if (chunk[i].x == x && chunk[i].y == y && chunk[i].z == z) {
                if (chunk[i].placed) {
                    for (let j = 0; j < placed.length; j++)
                        if (placed[j].x == x && placed[j].y == y && placed[j].z == z) {
                            placed.splice(j, 1);
                            break;
                        }
                } else destroyed.push({ x: x, y: y, z: z });
                chunk.splice(i, 1);
                break;
            }
        }
        reDraw();
    }
}

function isDestoryed(x, y, z) {
    for (let i = 0; i < destroyed.length; i++)
        if (destroyed[i].x == x && destroyed[i].y == y && destroyed[i].z == z)
            return true;
    return false;
}

function edgeBlock(side) {
    let posArr = [];
    for (let i = 0; i < chunks.length; i++)
        for (let j = 0; j < chunks[i].length; j++)
            if (side.axe == 'x') posArr.push(chunks[i][j].x);
            else if (side.axe == 'z') posArr.push(chunks[i][j].z);
    return side.side ? Math.max.apply(null, posArr) : Math.min.apply(null, posArr);
}

function yCollision() {
    for (let i = 0; i < chunks.length; i++) {
        for (let j = 0; j < chunks[i].length; j++) {
            let block = chunks[i][j];
            let collision = intersect({
                x: block.x,
                y: block.y + blockScale * 2,
                z: block.z,
                width: blockScale,
                height: blockScale,
                depth: blockScale
            }, player);
            if (collision &&
                camera.position.y <= block.y + blockScale / 2 + player.height &&
                camera.position.y >= block.y) {
                yspeed = 0;
                if (player.y - player.height / 2 < block.y + blockScale / 3) {
                    sprint = false;
                    canJump = false;
                    jumping = true;
                } else {
                    if (!jumpCd) canJump = true;
                    jumping = false;
                }
                fly = false;
            }
            collision = intersect(block, player);
            if (collision &&
                camera.position.y >= block.y - blockScale / 2 + player.height &&
                camera.position.y <= block.y) {
                yspeed = 0.1 * blockScale;
            }
        }
    }
}

function move() {
    if (playerDirection.z) player.forward(playerDirection.z * speed * (sprint ? sprintSpeedInc : 1));
    if (playerDirection.x) player.right(-playerDirection.x * speed);
    for (let i = 0; i < chunks.length; i++) {
        for (let j = 0; j < chunks[i].length; j++) {
            let block = chunks[i][j];
            let collision = intersect(block, player);

            if (collision &&
                block.y - blockScale / 2 < player.y + player.height / 2 &&
                block.y + blockScale / 2 > player.y + player.height / 2) {
                if (playerDirection.z) {
                    player.backward(playerDirection.z * speed * (sprint ? sprintSpeedInc : 1));
                    playerDirection.z = 0;
                }
                if (playerDirection.x) {
                    player.left(-playerDirection.x * speed);
                    playerDirection.x = 0;
                }
                sprint = false;
            }

            collision = intersect({
                x: block.x,
                y: block.y - blockScale,
                z: block.z,
                width: blockScale,
                height: blockScale,
                depth: blockScale
            }, player);

            if (collision &&
                block.y - blockScale / 2 + blockScale < player.y + player.height / 2 &&
                block.y + blockScale / 2 + blockScale > player.y + player.height / 2 &&
                canJump && autoJump && !jumpCd) {
                if (playerDirection.z) {
                    player.backward(playerDirection.z * speed * (sprint ? sprintSpeedInc : 1));
                    playerDirection.z = 0;
                }
                if (playerDirection.x) {
                    player.left(-playerDirection.x * speed);
                    playerDirection.x = 0;
                }
                sprint = false;
                canJump = false;
                jumping = true;
            } else if (collision &&
                block.y - blockScale / 2 + blockScale < player.y + player.height / 2 &&
                block.y + blockScale / 2 + blockScale > player.y + player.height / 2) {
                if (playerDirection.z) {
                    player.backward(playerDirection.z * speed * (sprint ? sprintSpeedInc : 1));
                    playerDirection.z = 0;
                }
                if (playerDirection.x) {
                    player.left(-playerDirection.x * speed);
                    playerDirection.x = 0;
                }
                sprint = false;
            }
        }
    }
}

function smoothWalkStop() {
    playerDirection.x /= deceleration;
    playerDirection.z /= deceleration;
    for (let i = 0; i < chunks.length; i++) {
        let bk = false;
        for (let j = 0; j < chunks[i].length; j++) {
            let block = chunks[i][j];
            let collision = intersect(block, player);
            if (collision &&
                block.y - blockScale / 2 < player.y + player.height / 2 &&
                block.y + blockScale / 2 > player.y + player.height / 2) {
                bk = true;
                playerDirection.x /= -deceleration;
                playerDirection.z /= -deceleration;
                sprint = false;
                break;
            }
        }
        if (bk) break;
    }
    player.forward(playerDirection.z * speed * (sprint ? sprintSpeedInc : 1));
    player.left(-playerDirection.x * speed * (sprint ? sprintSpeedInc : 1));
}

function reDraw() {
    scene.remove(instancedChunk);
    instancedChunk = new THREE.InstancedMesh(
        blockBox,
        texture['grass'],
        chunksSize * chunksSize * renderDistance * renderDistance * depth + placed.length
    );
    for (let i = 0, count = 0; i < chunks.length; i++)
        for (let j = 0; j < chunks[i].length; j++, count++) {
            let matrix = new THREE.Matrix4().makeTranslation(
                chunks[i][j].x,
                chunks[i][j].y,
                chunks[i][j].z
            );
            instancedChunk.setMatrixAt(count, matrix);
        }
    scene.add(instancedChunk);
}

function lowestZAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if ((i + 1) % renderDistance != 0) newChunk.push(chunks[i]);
    }

    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let x = lowestX + i * chunksSize; x < lowestX + (i + 1) * chunksSize; x++) {
            for (let z = lowestZ - chunksSize; z < lowestZ; z++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round((noise.perlin2(xoff, zoff) * amplitude) / blockScale) * blockScale;

                for (let d = 0; d < depth; d++)
                    if (!isDestoryed(x, v - d * blockScale, z))
                        chunk.push(new Block(x * blockScale, v - d * blockScale, z * blockScale));

                for (let b = 0; b < placed.length; b++)
                    if (placed[b].x == x && placed[b].z == z)
                        chunk.push(new Block(placed[b].x, placed[b].y, placed[b].z, true));
            }
        }
        newChunk.splice(i * renderDistance, 0, chunk);
    }
    chunks = newChunk;
    reDraw();
}

function highestZAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if (i % renderDistance != 0) newChunk.push(chunks[i]);
    }

    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let highestZ = edgeBlock({ axe: 'z', side: 1 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let x = lowestX + i * chunksSize; x < lowestX + (i + 1) * chunksSize; x++) {
            for (let z = highestZ + 1; z < highestZ + chunksSize + 1; z++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round((noise.perlin2(xoff, zoff) * amplitude) / blockScale) * blockScale;

                for (let d = 0; d < depth; d++)
                    if (!isDestoryed(x, v - d * blockScale, z))
                        chunk.push(new Block(x * blockScale, v - d * blockScale, z * blockScale));

                for (let b = 0; b < placed.length; b++)
                    if (placed[b].x == x && placed[b].z == z)
                        chunk.push(new Block(placed[b].x, placed[b].y, placed[b].z, true));
            }
        }
        newChunk.splice((i + 1) * renderDistance - 1, 0, chunk);
    }
    chunks = newChunk;
    reDraw();
}

function lowestXAlt() {
    let newChunk = []
    for (let i = 0; i < chunks.length; i++) {
        if (i < chunks.length - renderDistance) newChunk.push(chunks[i]);
    }

    let lowestX = edgeBlock({ axe: 'x', side: 0 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let z = lowestZ + i * chunksSize; z < lowestZ + (i + 1) * chunksSize; z++) {
            for (let x = lowestX - chunksSize; x < lowestX; x++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round((noise.perlin2(xoff, zoff) * amplitude) / blockScale) * blockScale;

                for (let d = 0; d < depth; d++)
                    if (!isDestoryed(x, v - d * blockScale, z))
                        chunk.push(new Block(x * blockScale, v - d * blockScale, z * blockScale));

                for (let b = 0; b < placed.length; b++)
                    if (placed[b].x == x && placed[b].z == z)
                        chunk.push(new Block(placed[b].x, placed[b].y, placed[b].z, true));
            }
        }
        newChunk.splice(i, 0, chunk);
    }
    chunks = newChunk;
    reDraw();
}

function highestXAlt() {
    let newChunk = [];
    for (let i = 0; i < chunks.length; i++) {
        if (i >= renderDistance) newChunk.push(chunks[i]);
    }

    let highestX = edgeBlock({ axe: 'x', side: 1 });
    let lowestZ = edgeBlock({ axe: 'z', side: 0 });
    for (let i = 0; i < renderDistance; i++) {
        let chunk = [];
        for (let z = lowestZ + i * chunksSize; z < lowestZ + (i + 1) * chunksSize; z++) {
            for (let x = highestX + 1; x < highestX + chunksSize + 1; x++) {
                xoff = inc * x;
                zoff = inc * z;
                let v = Math.round((noise.perlin2(xoff, zoff) * amplitude) / blockScale) * blockScale;

                for (let d = 0; d < depth; d++)
                    if (!isDestoryed(x, v - d * blockScale, z))
                        chunk.push(new Block(x * blockScale, v - d * blockScale, z * blockScale));

                for (let b = 0; b < placed.length; b++)
                    if (placed[b].x == x && placed[b].z == z)
                        chunk.push(new Block(placed[b].x, placed[b].y, placed[b].z, true));
            }
        }
        newChunk.splice(i + chunks.length - renderDistance, 0, chunk);
    }
    chunks = newChunk;
    reDraw();
}

function render() {
    raycaster.setFromCamera(pointer, camera);
    let intersection = raycaster.intersectObject(instancedChunk);
    if (intersection[0] != undefined && intersection[0].distance < armsLen) {
        if (!scene.children.includes(plane)) {
            let planeG = new THREE.PlaneGeometry(blockScale, blockScale);
            let planeM = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide
            });
            planeM.transparent = true;
            planeM.opacity = 0.2;
            plane = new THREE.Mesh(planeG, planeM);
            scene.add(plane);
        } else {
            plane.visible = true;
            let materiaIndex = intersection[0].face.materialIndex;
            let position = intersection[0].point;
            let x = 0,
                y = 0,
                z = 0;
            const inc = 0.01;
            switch (materiaIndex) {
                case 0:
                    plane.rotation.x = 0;
                    plane.rotation.y = Math.PI / 2;
                    plane.rotation.z = 0;
                    x = position.x + inc;
                    y = Math.round(position.y / blockScale) * blockScale;
                    z = Math.round(position.z / blockScale) * blockScale;
                    break;
                case 1:
                    plane.rotation.x = 0;
                    plane.rotation.y = Math.PI / 2;
                    plane.rotation.z = 0;
                    x = position.x - inc;
                    y = Math.round(position.y / blockScale) * blockScale;
                    z = Math.round(position.z / blockScale) * blockScale;
                    break;
                case 2:
                    plane.rotation.x = Math.PI / 2;
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / blockScale) * blockScale;
                    y = position.y + inc;
                    z = Math.round(position.z / blockScale) * blockScale;
                    break;
                case 3:
                    plane.rotation.x = Math.PI / 2;
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / blockScale) * blockScale;
                    y = position.y - inc;
                    z = Math.round(position.z / blockScale) * blockScale;
                    break
                case 4:
                    plane.rotation.x = 0;
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / blockScale) * blockScale;
                    y = Math.round(position.y / blockScale) * blockScale;
                    z = position.z + inc;
                    break;
                case 5:
                    plane.rotation.x = 0;
                    plane.rotation.y = 0;
                    plane.rotation.z = 0;
                    x = Math.round(position.x / blockScale) * blockScale;
                    y = Math.round(position.y / blockScale) * blockScale;
                    z = position.z - inc;
                    break;
                default:
                    break;
            }
            plane.position.x = x;
            plane.position.y = y;
            plane.position.z = z;
        }
    } else if (plane) plane.visible = false;
}

let lastForward = 0;
let lastJump = 0;
let playerDirection = new THREE.Vector3(0, 0, 0);

function update() {
    player.updatePosition();
    if (coolDownTime > 0) coolDownTime--;
    if (jumpCd > 0) jumpCd--;
    if (controls.isLocked === true) {
        let time = new Date().getTime();
        let moveForward = key[ctrlKey.forward] || false;
        let moveLeft = key[ctrlKey.left] || false;
        let moveBackward = key[ctrlKey.backward] || false;
        let moveRight = key[ctrlKey.right] || false;
        let moveUp = key[ctrlKey.jump] || false;
        let moveDown = key[ctrlKey.squat] || false;
        let use = key[ctrlKey.use] || false;
        let destory = key[ctrlKey.destory] || false;
        if (moveForward) {
            if (time - lastForward <= 300 && time - lastForward >= 100) sprint = true;
            lastForward = time;
        } else sprint = false;

        if (moveUp) {
            if (time - lastJump <= 300 && time - lastJump >= 100) fly = fly ? false : true;
            if (fly) {
                yspeed = gravity = 0;
                jumping = false;
            } else gravity = initGravity;
            lastJump = time;
        } else if (canJump) {
            fly = false;
            gravity = initGravity;
        };

        if (moveLeft || moveRight)
            playerDirection.x = Number(moveLeft) - Number(moveRight);
        if (moveForward || moveBackward)
            playerDirection.z = Number(moveForward) - Number(moveBackward);
        playerDirection.y = Number(moveUp) - Number(moveDown);
        //playerDirection.normalize();

        if (playerDirection.z || playerDirection.x) move();

        if (!moveForward && !moveLeft && !moveBackward && !moveRight)
            smoothWalkStop();

        if (playerDirection.y > 0 && fly) {
            camera.position.add(new THREE.Vector3(0, playerDirection.y * speed, 0));
        } else if (playerDirection.y > 0 && canJump && !jumpCd) {
            canJump = false;
            jumping = true;
            jumpCd = coolDown;
        }
        if (jumping && canJump) jumping = false;
        if (jumping)
            camera.position.add(new THREE.Vector3(0, jumpSpeed, 0));

        if (playerDirection.y < 0 && fly) {
            camera.position.add(new THREE.Vector3(0, playerDirection.y * speed, 0));
        }

        camera.position.y -= yspeed;
        yspeed += gravity;
        yCollision();

        if (use && coolDownTime == 0) placeBlock();
        if (destory && coolDownTime == 0) destoryBlock();
    } else if (key['f11']) controls.lock();

    if (camera.position.z <= edgeBlock({ axe: 'z', side: 0 }) + chunksChange)
        lowestZAlt('z-');
    else if (camera.position.z >= edgeBlock({ axe: 'z', side: 1 }) - chunksChange)
        highestZAlt('z+');
    else if (camera.position.x <= edgeBlock({ axe: 'x', side: 0 }) + chunksChange)
        lowestXAlt('x-');
    else if (camera.position.x >= edgeBlock({ axe: 'x', side: 1 }) - chunksChange)
        highestXAlt('x+');

    if (camera.position.y < minWorldY * 2) {
        yspeed = 0;
        camera.position.y = -minWorldY * 2;
    }

    document.getElementById('axe').innerText = `X:${camera.position.x.toFixed(2)}Y:${camera.position.y.toFixed(2)}Z:${camera.position.z.toFixed(2)}`;

    renderer.render(scene, camera);
}

function loop() {
    requestAnimationFrame(loop);
    update();
    render();
    statsPanel();
}
loop();