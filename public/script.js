// Set up the controls.
let camera, scene, renderer;
let keys = {}; // remembers which keyboard keys users are pressing.
let moveSpeed = 0.1;
let mouseSensitivity = 0.002;
const WORLD_HEIGHT = 1.7; // sets your eye level to 1.7 meters (like a real human height).

let buildings = []; // Starts with no buildings (empty array []).
let targetCube; // Right now it's empty, the actual cube would be stored it here.
const CUBE_POSITION = new THREE.Vector3(-5, WORLD_HEIGHT, -15); // set a special black cube at position and users need to find this cube.
let glitchIntensity = 0; // Increases as you get closer to the cube.
let clock = new THREE.Clock(); // Used to time glitches and animations.
let chaosStopped = false; // Chaos is happening.

// Game start botton.
init(); // Prepares the game world.
animate(); // Starts the game loop.

function init() {
  // https://stackoverflow.com/questions/7884081/what-is-the-use-of-the-init-usage-in-javascript
  scene = new THREE.Scene(); // The empty 3D room.
  scene.background = new THREE.Color(0x000000); // updates 60 times per second.

  camera = new THREE.PerspectiveCamera(
    75, // How wide the user could see.
    window.innerWidth / window.innerHeight, // Matches user's screen size.
    0.1, // Closest visible distance 10cm.
    1000 // Farthest visible distance 1km.
  );
  camera.position.set(0, WORLD_HEIGHT, 0); // Put the eyes at the starting point.

  renderer = new THREE.WebGLRenderer({ antialias: true }); // Makes edges smooth.
  renderer.setSize(window.innerWidth, window.innerHeight); // Gives it a canvas matching the browser size.
  document.body.appendChild(renderer.domElement); //  Hangs the canvas on the webpage.

  createChaoticCity();
  createGridFloor(); // Seperate the floor and the buildings.
  createTargetCube();
  addCubeParticles(); // The cube has mysterious floating particles around it like dust.

  document.addEventListener("keydown", (e) => (keys[e.key] = true)); // When press any key, it remembers that key is pressed in the object.
  document.addEventListener("keyup", (e) => (keys[e.key] = false)); // When release the key, it forgets it.

  document.addEventListener("click", () => {
    document.body.requestPointerLock(); // When you click anywhere, it locks your mouse to the game.
  });

  document.addEventListener("mousemove", (e) => {
    // When you move the mouse, it rotates the camera left/right.
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= e.movementX * mouseSensitivity;
    }
  });
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else

  window.addEventListener("resize", () => {
    // If users resize the browser window, it adjusts camera view to prevent stretching and renderer size to fill the new window size.
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  clock.start(); // Starts a stopwatch to time animations/glitches and it needed for smooth effects later.
}

function createGridFloor() {
  // Makes a giant white floor.
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(100, 50, 0x000000, 0x000000); // Adds a black grid on the floor.
  grid.material.opacity = 1.0;
  grid.position.y = 0.01; // Slightly raises it (0.01 units) to avoid visual glitches.
  scene.add(grid);
}
// Makes a city with random building heights, wireframe or solid buildings and positions.
function createChaoticCity() {
  buildings = [];
  const spacing = 3;
  const baseSize = 1;

  // Creates a grid system.
  for (let x = -25; x <= 25; x += spacing) {
    // Create the whole city.
    for (let z = -25; z <= 25; z += spacing) {
      if (Math.random() > 0.2) {
        // Rolls a random number: 80% chance to build, 20% chance to leave empty.
        const width = baseSize * (0.3 + Math.random()); // Random width (0.3-1.3).
        const height = baseSize * (0.5 + Math.random() * 8); // Random height (0.5-8.5).
        const depth = baseSize * (0.3 + Math.random()); // Random depth (0.3-1.3).
        let yPos = height / 2;
        if (Math.random() > 0.4) yPos += 3 + Math.random() * 8; // 60% of buildings float mid-air, set to random height (3-11 units higher).

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: Math.random() > 0.5, // Half look solid white, half look like X-ray outlines.
        });

        const building = new THREE.Mesh(geometry, material);
        building.position.set(
          x + (Math.random() - 0.5) * 4, // Random X position (-2 to +2 from grid).
          yPos,
          z + (Math.random() - 0.5) * 4 // Random Z position (-2 to +2 from grid).
        );
        building.userData = {
          // Saves the building's "normal state" to return to later.
          originalPosition: building.position.clone(),
          originalColor: 0xffffff,
          glitchTime: Math.random() * 10,
          glitchDuration: 0,
        };

        if (!material.wireframe) {
          const edges = new THREE.EdgesGeometry(geometry);
          const wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff })
          );
          building.add(wireframe);
        }

        scene.add(building);
        buildings.push(building);
      }
    }
  }
}

function createTargetCube() {
  const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2); // Slightly bigger cube.
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000, // Black.
    transparent: true, // See-through.
    opacity: 0.2, // 20% visible.
  });
  targetCube = new THREE.Mesh(geometry, material);
  targetCube.position.copy(CUBE_POSITION); // Places at (-5, 1.7, -15).
  scene.add(targetCube);
}

function addCubeParticles() {
  const geometry = new THREE.BufferGeometry();
  const count = 100; // 100 sparkles.
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    const angle = Math.random() * Math.PI * 2; // Random angle (0-360°).
    const radius = 2 + Math.random() * 3; // Random distance (2-5 units).
    positions[i] = CUBE_POSITION.x + Math.cos(angle) * radius; // X position.
    positions[i + 1] = CUBE_POSITION.y + (Math.random() - 0.5) * 2; // Y position.
    positions[i + 2] = CUBE_POSITION.z + Math.sin(angle) * radius; // Z position.
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 0.3, // Small dots.
    color: 0x666666, // Dark gray.
    transparent: true,
    opacity: 0.5, // Semi-transparent.
  });
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}
// Setting how to play this game.
function handleMovement() {
  // User's movement matches where you're looking (like in Minecraft).
  const dir = new THREE.Vector3();
  if (keys["w"]) dir.z -= 1;
  if (keys["s"]) dir.z += 1;
  if (keys["a"]) dir.x -= 1;
  if (keys["d"]) dir.x += 1;

  if (dir.length() > 0) {
    // Checks if users are pressing any movement keys.
    dir.normalize(); // Fixes "diagonal speed boost" (makes moving diagonally same speed as straight).
    const yaw = camera.rotation.y; // User's current left/right rotation.
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    camera.position.add(
      right
        .multiplyScalar(dir.x * moveSpeed) // Right/Left movement.
        .add(forward.multiplyScalar(dir.z * moveSpeed)) //Forward/Back movement
      // Where "forward" is based on user view.
    );
  }
  camera.position.y = WORLD_HEIGHT; // Keep users from floating/sinking.
}

function updateCubeVisibility() {
  // Measures how far you are from the black cube.
  const dist = camera.position.distanceTo(CUBE_POSITION); // // Creates a 0→1 value where: 0 = Far away (>20 units), 1 = Very close (0 units).

  glitchIntensity = Math.min(1, Math.max(0, 1 - dist / 20)); //Clamps it between 0 and 1.
  if (!chaosStopped) {
    if (dist < 2.5) {
      // When users reach the black cube, all glitches stop and cubes back to normal.
      chaosStopped = true;
      // Reset all buildings to original state.
      buildings.forEach((b) => {
        // When you reach the cube, returns all buildings to their original positions, reset colours into white and set background into pure black.
        b.position.copy(b.userData.originalPosition);
        b.material.color.setHex(b.userData.originalColor);
      });
      scene.background.setHex(0x000000);
    }

    // Cube becomes more visible.
    targetCube.material.opacity = 0.2 + glitchIntensity * 0.8;
    targetCube.scale.set(
      1 + glitchIntensity,
      1 + glitchIntensity,
      1 + glitchIntensity
    ); // Effect intensifies as you get closer.
  } else {
    targetCube.material.color.setHex(0x00ff00); // Turns green.
    targetCube.material.opacity = 1; // Fully solid.
    targetCube.scale.set(1.5, 1.5, 1.5); // Grows 50%.

    // Add stabilization sphere.
    if (!scene.getObjectByName("stabilizationSphere")) {
      // Green wireframe sphere.
      const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(CUBE_POSITION);
      sphere.name = "stabilizationSphere";
      scene.add(sphere);
    }
  }
}

function updateGlitchEffect() {
  // let the world chaotic and feels like unstable.
  if (chaosStopped) return;

  const time = clock.getElapsedTime();

  buildings.forEach((b) => {
    // For every building in the city.
    if (b.userData.glitchDuration > 0) {
      // Make it shake
      b.position.x += (Math.random() - 0.5) * 0.8; // Random left/right movement.
      b.position.y += (Math.random() - 0.5) * 0.8; // Random up/down bounce.
      b.material.color.setHex(Math.random() > 0.3 ? 0x444444 : 0xffffff); // 70% chance gray, 30% white.
      b.userData.glitchDuration--; // Reduce timer by 1.
    } else if (Math.random() < 0.01 + glitchIntensity * 0.05) {
      b.userData.glitchDuration = 15 + Math.floor(Math.random() * 20); // New timer (15-35).
    } else {
      b.position.copy(b.userData.originalPosition); // Reset position.
      b.material.color.setHex(b.userData.originalColor); // Reset colour.
    }
  });

  if (Math.random() < glitchIntensity * 0.2) {
    // Far from cube it would be rare glitches, close to cube it would be frequent glitches.
    scene.background.setHex(Math.random() > 0.5 ? 0x111111 : 0x000000);
  }
}

function animate() {
  // Setting game loop and constantly updates user's position, building glitches, cube effect and camera view.
  requestAnimationFrame(animate);
  handleMovement();
  updateCubeVisibility();
  if (!chaosStopped) updateGlitchEffect();
  renderer.render(scene, camera);
}
