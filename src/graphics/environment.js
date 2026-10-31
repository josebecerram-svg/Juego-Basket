import * as T from "../../vendor/three.module.js";
import { RGBELoader } from "../../vendor/addons/loaders/RGBELoader.js";
import { graphics } from "./settings.js";
export async function stadiumLighting(renderer, scene) {
  const hdr = await new RGBELoader().loadAsync(graphics.environment);
  const pmrem = new T.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(hdr);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.55;
  hdr.dispose();
  pmrem.dispose();
  scene.background = new T.Color("#77838d");
  scene.fog = new T.Fog("#68747e", 40, 110);
  const ambient = new T.HemisphereLight("#f3f2eb", "#394756", 0.4);
  scene.add(ambient);
  const key = new T.DirectionalLight("#fff3df", 1.35);
  key.position.set(-8, 16, -3);
  key.target.position.set(0, 0, -8.2);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {
    left: -13,
    right: 13,
    top: 19,
    bottom: -19,
    near: 0.5,
    far: 45,
  });
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0001;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  const spots = [];
  for (const x of [-6, 6])
    for (const z of [-20, -12, -4, 4]) {
      const spot = new T.SpotLight("#eaf2ff", 300, 40, Math.PI / 4, 0.65, 2);
      spot.position.set(x, 15.5, z);
      spot.target.position.set(-x * 0.35, 0, z - 2);
      scene.add(spot, spot.target);
      spots.push(spot);
      const fixture = new T.Mesh(
        new T.BoxGeometry(1.2, 0.08, 0.55),
        new T.MeshStandardMaterial({
          color: "#fff7de",
          emissive: "#fff0cf",
          emissiveIntensity: 8,
        }),
      );
      fixture.position.copy(spot.position);
      scene.add(fixture);
    }
  const cross = spots[5];
  cross.shadow.camera.near = 0.5;
  cross.shadow.camera.far = 35;
  cross.shadow.normalBias = 0.025;
  cross.shadow.bias = -0.0001;
  return {
    setQuality(profile) {
      key.shadow.mapSize.setScalar(profile.shadow);
      key.shadow.map?.dispose();
      key.shadow.map = null;
      cross.castShadow = profile.shadow === 4096;
      cross.shadow.mapSize.setScalar(2048);
      cross.shadow.map?.dispose();
      cross.shadow.map = null;
    },
    dispose() {
      target.dispose();
    },
  };
}
