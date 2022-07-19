import * as THREE from 'three'
import { GLTFLoader } from 'https://unpkg.com/three@0.141.0/examples/jsm/loaders/GLTFLoader.js'
import { PointerLockControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/PointerLockControls.js'

//texture
let loaders = new THREE.TextureLoader();
let texture = {
    grass: [
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png')
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png')
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_top.png')
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/dirt.png')
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png')
        }),
        new THREE.MeshBasicMaterial({
            map: loaders.load('./textures/blocks/grass_side.png')
        })
    ]
};

// vars
const blockScale = 1;
const chunksSize = 16;
const coolDown = 8;
const renderDistance = 20;
const worldSize = chunksSize * renderDistance * blockScale;
const chunksChange = worldSize * 0.4;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0.5 * 2 - 1, -1 * 0.5 * 2 + 1);
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
let speed = 0.2 * blockScale;
let blockLine = false;
let collision;
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
                    chunk.push(new Block(x * blockScale, v, z * blockScale));
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
    this.placed = placed;

    this.getVoxel = function(x, y, z) {
        for (let i = 0; i < chunks.length; i++)
            for (let j = 0; j < chunks[i].length; j++)
                if (chunks[i][j].x == x && chunks[i][j].y == y && chunks[i][j].z == z)
                    return true;
        return false;
    }

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
        }
        // texture["grass"].forEach(img => {
        //     //img.map.minFilter = THREE.NearestFilter;
        //     img.map.magFilter = THREE.NearestFilter;
        // });
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

function reDraw() {
    scene.remove(instancedChunk);
    instancedChunk = new THREE.InstancedMesh(
        blockBox,
        texture['grass'],
        chunksSize * chunksSize * renderDistance * renderDistance + placed.length
    );
    for (let i = 0, count = 0; i < chunks.length; i++)
        for (let j = 0; j < chunks[i].length; j++, count++) {
            let matrix = new THREE.Matrix4().makeTranslation(
                chunks[i][j].x,
                chunks[i][j].y,
                chunks[i][j].z
            )
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
                if (!isDestoryed(x, v, z))
                    chunk.push(new Block(x * blockScale, v, z * blockScale));

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
                if (!isDestoryed(x, v, z))
                    chunk.push(new Block(x * blockScale, v, z * blockScale));

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
                if (!isDestoryed(x, v, z))
                    chunk.push(new Block(x * blockScale, v, z * blockScale));

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
                if (!isDestoryed(x, v, z))
                    chunk.push(new Block(x * blockScale, v, z * blockScale));

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

function update() {
    if (coolDownTime > 0) coolDownTime--;
    if (controls.isLocked === true) {
        let playerDirection = new THREE.Vector3(0, 0, 0);
        let moveForward = key[ctrlKey.forward] || false;
        let moveLeft = key[ctrlKey.left] || false;
        let moveBackward = key[ctrlKey.backward] || false;
        let moveRight = key[ctrlKey.right] || false;
        let moveUp = key[ctrlKey.jump] || false;
        let moveDown = key[ctrlKey.squat] || false;
        let use = key[ctrlKey.use] || false;
        let destory = key[ctrlKey.destory] || false;
        let canJump = false;
        playerDirection.x = Number(moveLeft) - Number(moveRight);
        playerDirection.z = Number(moveForward) - Number(moveBackward);
        playerDirection.y = Number(moveUp) - Number(moveDown);
        //playerDirection.normalize();
        controls.moveForward(playerDirection.z * speed);
        controls.moveRight(-playerDirection.x * speed);
        if (playerDirection.y)
            camera.position.add(new THREE.Vector3(0, playerDirection.y * speed, 0));
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

    document.getElementById('axe').innerText = `
    X:${camera.position.x.toFixed(2)}
    Y:${camera.position.y.toFixed(2)}
    Z:${camera.position.z.toFixed(2)}`

    renderer.render(scene, camera);
    //console.log(chunks[0][0].direction);
}

function loop() {
    requestAnimationFrame(loop);
    update();
    render();
    statsPanel();
}
loop();