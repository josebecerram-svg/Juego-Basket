# Basket · prototipo 03 · Gimnasio 3D

Práctica de tiro en tercera persona con Three.js. Cancha interior de 15 × 28 m, parquet claro generado por código, zonas azules, líneas, dos tableros y aros a 3,05 m y graderías oscuras. La escena se construye con geometría 3D; no contiene una fotografía como fondo.

## Iniciar

En GitHub Pages: https://josebecerram-svg.github.io/Juego-Basket/ . Las actualizaciones pueden tardar unos minutos; si ves una versión anterior, recarga sin caché.

Para desarrollo local: Node.js >=18, `npm run dev` en la carpeta del proyecto, y `http://localhost:5173` en esa misma máquina. No requiere instalación npm ni compilación. En un entorno remoto, localhost solo está disponible dentro de esa máquina. Requiere navegador con WebGL 2.

## Controles

- **W:** avanzar hacia donde mira el personaje. **S:** retroceder. **A/D:** desplazarse a izquierda/derecha respecto a esa orientación. El movimiento tiene aceleración, diagonales normalizadas y límites en las líneas de la cancha.
- **Mueve el mouse sobre la cancha:** ajusta directamente la dirección y la elevación. El cuerpo gira y la cámara acompaña suavemente desde atrás, por encima y ligeramente a un lado. El encuadre se adapta para incluir el aro cercano, el cuerpo y el balón en vuelo.
- **Mantén clic izquierdo sobre la cancha:** carga potencia. **Suéltalo:** animación y lanzamiento. La carga llega al máximo en 1,6 segundos y se mantiene allí. No se necesita capturar ni bloquear el mouse; puedes salir de la cancha y usar la interfaz normalmente.
- También puedes ajustar **Dirección/Ángulo** con los deslizadores y mantener/soltar **Lanzar**, utilizable con mouse o pantalla táctil. El botón admite Espacio/Enter cuando tiene el foco.
- WASD no intercepta escritura ni controles cuando un campo o botón tiene el foco. Haz clic en la cancha para volver a controlarla. Al cambiar de ventana se cancelan la carga y las teclas retenidas.
- Solo hay un balón. Puedes caminar durante la carga y el vuelo; la posición se fija durante los 0,28 segundos de preparación para soltar el balón desde las manos. Al terminar el intento aparece **¡Canasta!** o **Fallaste**, y el balón vuelve automáticamente a la posición actual del jugador. No hace falta perseguirlo.

Desde la posición inicial, **dirección 0°, ángulo 55° y potencia cercana al 42 %** permiten practicar una canasta. Al moverte, tendrás que ajustar dirección y potencia. La guía es orientativa: muestra una parábola ideal sin rebotes y, antes de cargar, representa una potencia de referencia del 42 %.

## Organización y ajustes

- `src/config.js`: gravedad, fuerza mínima/máxima, carga, elevación, posición inicial, límites de cancha, velocidad/aceleración y asignación WASD configurable.
- `movement.js`: movimiento relativo a la orientación del jugador y contención dentro de la cancha.
- `physics.js`: balón en manos, carga, suelta desde una posición dinámica, trayectoria 3D, colisiones con ambos tableros y aros y suelo. La canasta exige un cruce descendente dentro de la abertura, antes del primer contacto con el suelo, una sola vez por intento.
- `camera.js`: seguimiento en tercera persona y ajuste de encuadre, sin cámara desde los ojos.
- `gym.js`: parquet procedural, pintura, líneas, canastas, gradas e iluminación interior.
- `player.js`: personaje, giro, brazos y animación básica de piernas.
- `controls.js`: teclado, apuntado directo, clic izquierdo y controles alternativos.
- `scene.js` / `main.js`: renderizado y bucle físico a 240 Hz.

## Validación

`npm test` ejecuta pruebas de WASD, diagonales, límites y frenado; posición dinámica de salida; tiros corto, largo y lateral; canastas, intentos consecutivos y exclusión de tiros simultáneos; colisiones con suelo/tablero/aro; y encuadre de cámara en escritorio/móvil en distintas posiciones y orientaciones.

También se comprueba en Chromium el movimiento con teclas reales, apuntado con mouse, carga/suelta de clic izquierdo, aciertos/fallos y respeto del foco de la interfaz.

## Límites

Física y personaje simplificados; red decorativa y sin colisiones con el cuerpo, gradas o paredes. No hay recogida manual: recuperación automática. Movimiento para teclado; móvil conserva puntería y lanzamiento táctiles, sin joystick de desplazamiento. No hay historia, rivales, trucos ni modos multijugador. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.
