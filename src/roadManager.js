import * as THREE from 'three';

export function createRoad() {
  const roadGroup = new THREE.Group();

  // Estrada
  const geometry = new THREE.BoxGeometry(10, 0.1, 60);
  const material = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const road = new THREE.Mesh(geometry, material);
  road.receiveShadow = true;
  roadGroup.add(road);

  // Linhas tracejadas entre as faixas
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lineGeometry = new THREE.PlaneGeometry(0.1, 1); // traço fino e curto

  const spacing = 2; // espaço entre traços
  const positionsZ = [];
  for (let z = -29; z <= 29; z += spacing) {
    positionsZ.push(z);
  }

// Linhas tracejadas entre faixas
positionsZ.forEach((z) => {
    const lineLeft = new THREE.Mesh(lineGeometry, lineMaterial);
    lineLeft.rotation.x = -Math.PI / 2;
    lineLeft.position.set(-1.66, 0.051, z);
    roadGroup.add(lineLeft);
  
    const lineRight = new THREE.Mesh(lineGeometry, lineMaterial);
    lineRight.rotation.x = -Math.PI / 2;
    lineRight.position.set(1.66, 0.051, z);
    roadGroup.add(lineRight);
  });
  

  return roadGroup;
}
