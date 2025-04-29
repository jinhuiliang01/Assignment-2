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

let audioElement,
  audioContext,
  gainNode,
  isSoundPlaying = false;
let playButton;

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

// Create sound toggle button.
playButton = document.createElement("button"); // Creates a new HTML <button> element and assigns it to the variable playButton.
playButton.textContent = "Play Sound"; // Sets the button's text to "Play Sound".
playButton.style.position = "absolute"; // Positions it relative to the nearest positioned ancestor.
playButton.style.top = "20px";
playButton.style.right = "20px"; // Places it 20px from the top-right corner.
playButton.style.zIndex = "1000"; // Ensures the button stays on top of other elements.
document.body.appendChild(playButton); // Adds the button to the <body> of the webpage.

// Audio setup.
audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Creates a new Web Audio API context.
gainNode = audioContext.createGain(); // Creates a gain node (controls audio volume).
gainNode.gain.value = 0; // Sets initial volume to 0 (muted).

// Create audio element.
audioElement = new Audio("glitch sound.wav"); // Creates an <audio> element that loads "glitch sound.wav".
audioElement.loop = true; // Makes the audio loop when played.

// Connect audio element to Web Audio API.
const source = audioContext.createMediaElementSource(audioElement); // Creates a source node from the <audio> element.
source.connect(gainNode);
gainNode.connect(audioContext.destination); // Connects the audio source to gain node to speakers.

// Handle browser autoplay restrictions.
document.body.addEventListener(
  "click",
  () => {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  },
  { once: true }
); // This listener resumes the audio context on the first click anywhere on the page.

// Button click handler.
playButton.addEventListener("click", () => {
  if (chaosStopped) return; // If chaosStopped (a variable not shown here) is true, exit early.

  isSoundPlaying = !isSoundPlaying; // Toggles isSoundPlaying between true and false.
  gainNode.gain.value = isSoundPlaying ? 1 : 0; // If isSoundPlaying is true, sets volume to 1, if false, sets volume to 0.

  if (isSoundPlaying) {
    // If playing, starts audio playback and set the word in the button to stop sound.
    audioElement.play();
    playButton.textContent = "Stop Sound";
  } else {
    audioElement.pause(); // If paused, stops audio and set the word in the button to play sound.
    playButton.textContent = "Play Sound";
  }
});

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

  // Recursive function to generate building rows (modified)
  function generateBuildingRow(currentX) {
    // Base case: stop recursion when past maximum X
    if (currentX > 25) return;

    // Process current row
    for (let z = -25; z <= 25; z += spacing) {
      if (Math.random() > 0.2) {
        // Keep your 80% building chance
        // Original building creation code (preserved)
        const width = baseSize * (0.3 + Math.random());
        const height = baseSize * (0.5 + Math.random() * 8);
        const depth = baseSize * (0.3 + Math.random());
        let yPos = height / 2;
        if (Math.random() > 0.4) yPos += 3 + Math.random() * 8;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: Math.random() > 0.5,
        });

        const building = new THREE.Mesh(geometry, material);
        building.position.set(
          currentX + (Math.random() - 0.5) * 4, // Fixed x position calculation
          yPos,
          z + (Math.random() - 0.5) * 4
        );

        // Keep original userData setup
        building.userData = {
          originalPosition: building.position.clone(),
          originalColor: 0xffffff,
          glitchTime: Math.random() * 10,
          glitchDuration: 0,
        };

        // Preserve wireframe logic
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

    // Recursive call with next X position (fixed spacing)
    generateBuildingRow(currentX + spacing);
  }

  // Start recursion with initial X position (matches original loop)
  generateBuildingRow(-25);
}

function createTargetCube() {
  const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2); // Slightly bigger cube.
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000, // Black.
    transparent: true, // See through.
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
  const dist = camera.position.distanceTo(CUBE_POSITION); // Computes the distance (dist) between the camera and CUBE_POSITION (a THREE.Vector3).
  glitchIntensity = Math.min(1, Math.max(0, 1 - dist / 20)); // Calculates glitchIntensity (a value between 0 and 1): 1 - dist / 20 → Intensity increases as the camera gets closer (within 20 units).
  // Math.max(0, ...) → Clamps to minimum 0.
  // Math.min(1, ...) → Clamps to maximum 1.

  if (!chaosStopped) {
    // Executes this block if chaosStopped is false.
    if (dist < 2.5) {
      // If the camera is within 2.5 units of the cube
      chaosStopped = true; // Set it to true.

      // Reset all buildings to original state
      buildings.forEach((b) => {
        b.position.copy(b.userData.originalPosition);
        b.material.color.setHex(b.userData.originalColor);
      }); // Resets each building's position and color to their original values (stored in userData).
      scene.background.setHex(0x000000); // Sets the scene's background to black.

      // Stop sound if it's playing
      if (isSoundPlaying) {
        gainNode.gain.value = 0; // Mutes volume.
        audioElement.pause(); // Pauses the audio element.
        isSoundPlaying = false;
        playButton.textContent = "Play Sound"; // Updates isSoundPlaying and button text.
      }

      // Disable the play button so user can't restart the sound
      playButton.style.display = "none"; // Hides the sound toggle button.
    }

    // Cube becomes more visible as you get closer
    targetCube.material.opacity = 0.2 + glitchIntensity * 0.8; // Sets the cube's opacity: minimum: 0.2, maximum 1.0.
    targetCube.scale.set(
      1 + glitchIntensity,
      1 + glitchIntensity,
      1 + glitchIntensity
    ); // Scales the cube: minimum scale 1, maximum scale 2.
  } else {
    // Executes this block when chaos mode is disabled.
    targetCube.material.color.setHex(0x00ff00);
    targetCube.material.opacity = 1;
    targetCube.scale.set(1.5, 1.5, 1.5); // Makes the cube: green, fully opaque and slightly bigger.

    if (!scene.getObjectByName("stabilizationSphere")) {
      // Checks if a sphere named "stabilizationSphere" doesn’t already exist.
      const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      }); // Creates a green wireframe sphere: radius 3, segments 32, wireframe with lower opacity.
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(CUBE_POSITION); // Places the sphere at CUBE_POSITION.
      sphere.name = "stabilizationSphere"; // Names it for future reference.
      scene.add(sphere); // Adds it to the scene.
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
