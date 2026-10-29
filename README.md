# Basket · prototipo 02 · 3D

Práctica de tiro en tercera persona con Three.js, cámara detrás y a un lado del jugador y física 3D a paso fijo. Paleta y modelos provisionales. Un jugador quieto, un balón y un aro.

## Abrir

La versión publicada en GitHub Pages usa directamente `index.html`, `src/` y `vendor/`; no necesita compilación ni CDN. Para ejecutarlo en tu computador, con los archivos descargados y Node.js >=18: ejecuta `npm run dev` desde la carpeta del proyecto y abre `http://localhost:5173` en esa misma máquina. El navegador necesita WebGL 2. En la nube, localhost solo funciona dentro de la máquina remota.

## Controles

- Arrastra sobre la cancha con mouse o dedo para ajustar dirección horizontal y elevación. También puedes usar los deslizadores **Dirección** y **Ángulo**.
- Mantén presionado **Lanzar** para cargar de 0 a 100 % en 1,6 segundos; suéltalo para tirar. La carga permanece al máximo si continúas manteniendo el botón. La línea muestra la trayectoria prevista sin colisiones; antes de cargar representa una potencia orientativa del 42 %.
- El medidor muestra la potencia actual. Como referencia para practicar, dirección 0°, ángulo 55° y potencia cercana al 42 % permiten encestar; cargar menos queda corto y cargar mucho puede sobrepasar el aro.
- Espera a que termine el movimiento del balón: aparecerá **¡Canasta!** o **Fallaste**, y regresará a tus manos. Solo hay un balón y no se puede iniciar otro tiro durante un intento.
- El botón también admite mantener y soltar Espacio/Enter cuando tiene el foco, como comportamiento accesible del propio botón. No hay atajos globales ni teclas de movimiento.

## Parámetros y módulos

`src/config.js` centraliza `minForce`/`maxForce` (4,8–10,8 m/s), `chargeSeconds`, gravedad, posición inicial, radios y restitución. Dirección: −25° a +25° respecto al aro. Elevación: 40° a 70°. Internamente los ángulos se expresan en radianes. Los límites se definen en `config.js` y `controls.js` los aplica a los deslizadores.

- `physics.js`: velocidad tridimensional, estados, colisiones esfera/suelo, tablero finito y aro toroidal; detección descendente dentro de la abertura, una vez por tiro y antes de tocar el suelo.
- `camera.js`: perspectiva de tercera persona y encuadre adaptable, anclado a la posición fija del jugador.
- `player.js`: cuerpo y brazos articulados; manos en el punto de salida.
- `scene.js`: modelos 3D, iluminación, guía y renderizado.
- `controls.js`: puntería, carga, cancelación y controles de pantalla.
- `main.js`: integración a 240 Hz, interfaz y renderizado.

## Validación

`npm test` comprueba tiros corto, largo, lateral y canasta, tres intentos consecutivos, salida desde las manos, exclusión de tiros simultáneos, rebotes en suelo/tablero/aro, dirección del cruce y carga/cancelación.

## Límites

Física simplificada, sin simulación de tela para la red ni colisiones con el cuerpo. Modelos geométricos provisionales. Cámara fija de tercera persona, sin desplazamientos ni órbita libre. Sin rivales ni modos adicionales. La guía ignora rebotes y usa una curva ideal; el resultado real se calcula con integración y colisiones. Los intentos terminan al quedar casi inmóvil el balón o a los seis segundos. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.
